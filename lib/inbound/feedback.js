const _ = require('lodash');
const url = require('url');
const flat = require('flat');
const mimecontent = require('mime-content');
const mimeparse = require('mimeparse');
const xmlbuilder = require('xmlbuilder');
const dotaccess = require('dotaccess');
const HttpError = require('leadconduit-integration').HttpError;

const supportedMimeTypes = [
  'application/x-www-form-urlencoded',
  'application/json',
  'application/xml',
  'text/xml'
];

const supportedMimeTypeLookup = supportedMimeTypes.reduce(((lookup, mimeType) => {
  lookup[mimeType] = true;
  return lookup;
}), {});


const request = (req) => {

  // ensure supported method
  const method = (req.method) ? req.method.toLowerCase() : null;
  if (method !== 'get' && method !== 'post') {
    throw new HttpError(415, { 'Content-Type': 'text/plain', Allow: 'GET, POST' }, `The ${method.toUpperCase()} method is not allowed`);
  }

  // ensure acceptable content type, preferring JSON
  const mimeType = selectMimeType(req.headers['Accept']);
  if (!mimeType) {
    throw new HttpError(406, { 'Content-Type': 'text/plain' }, 'Not capable of generating content according to the Accept header');
  }

  const feedbackVars = parseFeedbackVars(req);
  delete feedbackVars.event_id;
  return feedbackVars;
};


const parseFeedbackVars = (req) => {
  const method = (req.method) ? req.method.toLowerCase() : null;

  // parse the query string
  const uri = url.parse(req.uri, true);
  const query = flat.unflatten(uri.query);

  if (method === 'get') {
    return query;
  } else if (method === 'post') {

    if (req.headers['Content-Length'] || req.headers['Transfer-Encoding'] === 'chunked') {

      // assume a request body

      // ensure a content type header
      const contentType = req.headers['Content-Type'];
      if (!contentType) {
        throw new HttpError(415, {'Content-Type': 'text/plain'}, 'Content-Type header is required');
      }

      // ensure valid mime type
      const mimeType = selectMimeType(req.headers['Content-Type']);
      if (!supportedMimeTypeLookup[mimeType]) {
        throw new HttpError(406, {'Content-Type': 'text/plain'}, `MIME type in Content-Type header is not supported. Use only ${supportedMimeTypes.join(', ')}.`);
      }

      // parse request body according the the mime type
      const body = (req.body) ? req.body.trim() : null;
      if (!body) {
        return query;
      }

      let parsed;
      try {
        parsed = mimecontent(body, mimeType);
      } catch(e)  {
        throw new HttpError(400, { 'Content-Type': 'text/plain' }, `Body is not parsable as ${mimeType} -- ${e.message}`);
      }

      // if form URL encoding, convert dot notation keys
      if (mimeType == 'application/x-www-form-urlencoded') {
        parsed = flat.unflatten(parsed);
      }

      // if XML, turn doc into an object
      if (mimeType === 'application/xml' || mimeType === 'text/xml') {
        try {
          parsed = parsed.toObject({explicitArray: false, explicitRoot: false, mergeAttrs: true});
        } catch (e) {
          const xmlError = e.toString().replace(/\r?\n/g, ' ');
          throw new HttpError(400, {'Content-Type': 'text/plain'}, `Body does not contain XML or XML is unparseable -- ${xmlError}.`);
        }
      }

      // merge query string data into data parsed from request body
      _.merge(parsed, query);

      return parsed;
    } else {
      // assume no request body
      return query;
    }
  }
};


request.variables = () => [
  { name: 'type', label: 'Feedback type', type: 'string', description: 'The type of feedback being given', examples: ['return', 'conversion'] },
  { name: 'reason', label: 'Feedback reason', type: 'string', description: 'The reason the feedback is being given', examples: ['Disconnected phone', 'Wrong number', 'Uncontactable', 'New customer']}
];

const response = (req, vars, fieldIds = ['outcome', 'reason', 'lead.id', 'lead.first_name', 'lead.last_name', 'lead.email', 'lead.phone_1', 'price']) => {

  const mimeType = selectMimeType(req.headers['Accept']);

  let rtn = {};
  for (let field of fieldIds) {
    rtn[field] = (dotaccess.get(vars, field)) ?
      dotaccess.get(vars, field).valueOf() :
      undefined;
  }
  rtn = flat.unflatten(rtn);

  // if outcome is failure, return negative price representing refund
  if (rtn.outcome === 'failure') {
    rtn.price = -Math.abs(rtn.price);
  }

  let body = '';
  if (mimeType === 'application/xml' || mimeType === 'text/xml') {
    body = xmlbuilder.create({result: rtn}).end({pretty: true});
  } else if (mimeType === 'application/json') {
    body = JSON.stringify(rtn);
  } else {
    const lines = [];
    for (let [fieldName, fieldValue] of new Map(Object.entries(rtn))) {
      lines.push(`${fieldName.replace(/./g, '_')}:${fieldValue || ''}`);
    }
    body = lines.join('\n');
  }

  const headers = {
    'Content-Type': mimeType,
    'Content-Length': Buffer.byteLength(body)
  };

  const status = (rtn.reason && rtn.reason.match(/forbidden/i)) ? 409 : 201;

  return {
    status: status,
    headers: headers,
    body: body
  };
};


response.variables = () => [
  { name: 'outcome', type: 'string', description: 'The outcome of the feedback request (default is success, meaning that the feedback was accepted)' },
  { name: 'reason', type: 'string', description: 'If the outcome was a failure, this is the reason' },
  { name: 'price', type: 'number', description: 'The price of the lead' },
  { name: 'lead.id', type: 'string', description: 'The lead identifier' },
  { name: 'lead.first_name', type: 'string', description: 'The consumer\'s first name' },
  { name: 'lead.last_name', type: 'string', description: 'The consumer\'s last name' },
  { name: 'lead.email', type: 'string', description: 'The consumer\'s email address' },
  { name: 'lead.phone_1', type: 'string', description: 'The consumer\'s phone number' }
];


const selectMimeType = (contentType) => {
  contentType = contentType || 'application/json';
  if (contentType === '*/*') contentType = 'application/json';
  return mimeparse.bestMatch(supportedMimeTypes, contentType);
};

module.exports = {
  name: 'Standard Feedback',
  request,
  response
};
