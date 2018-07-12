url = require('url');
flatten = require('flat');
querystring = require('querystring');

const request = (vars) => {

  let body = flatten(vars.lead);


  for(let key in body) {
    let value = body[key];
    if(value) body[key] = value.toString();
  }

  for(let key in vars.custom) {
    let value = vars.custom[key];
    if(value) body[key] = value;
  }

  body = querystring.stringify(body);

  return {
    body: body,
    url: vars.url,
    headers: {
      'Content-Type': 'application/json'
    }
  }

};

request.variables = () => {
  return [
    { name: 'url', type: 'string', required: true, description: '' },
    { name: 'custom.*', type: 'wildcard' }
  ];
};

const response = (vars, req, res) => {

  if(!res || !res.body) {
    return {
      outcome: 'error',
      reason: 'unknown response'
    }
  }

  try {
    let parsed = JSON.parse(res.body);

    return {
      outcome: parsed.outcome,
      reason: parsed.reason,
      lead: {
        id: parsed.lead.id
      }
    };
  }
  catch (e) {
    return {
      outcome: 'error',
      reason: 'unable to parse response'
    }
  }

};

response.variables = () => {
  return [
    { name: 'outcome', type: 'string', description: 'The outcome of the lead' },
    { name: 'reason', type: 'string', description: 'If the outcome was not success, this is the reason' },
    { name: 'lead.id', type: 'string', description: `The lead's ID` }
  ]
};

const validate = (vars) => {

  if (!vars.url) return 'URL must not be blank';
  let parsed = url.parse(vars.url);
  if (!(parsed.host && parsed.host.match(/leadconduit/))) return 'URL must be a valid LeadConduit posting URL';

};

module.exports = {
  name: 'To Flow',
  request: request,
  response: response,
  validate: validate
};