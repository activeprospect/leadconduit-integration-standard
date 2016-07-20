_ = require('lodash')
url = require('url')
querystring = require('querystring')
flat = require('flat')
mimecontent = require('mime-content')
mimeparse = require('mimeparse')
xmlbuilder = require('xmlbuilder')
dotaccess = require('dotaccess')
HttpError = require('leadconduit-integration').HttpError

supportedMimeTypes = [
  'application/x-www-form-urlencoded',
  'application/json',
  'application/xml',
  'text/xml'
]

supportedMimeTypeLookup = supportedMimeTypes.reduce(((lookup, mimeType) ->
  lookup[mimeType] = true
  lookup
), {})


request = (req) ->
  # ensure supported method
  method = req.method?.toLowerCase()
  if method != 'get' and method != 'post'
    throw new HttpError(415, { 'Content-Type': 'text/plain', Allow: 'GET, POST' }, "The #{method.toUpperCase()} method is not allowed")

  # ensure acceptable content type, preferring JSON
  mimeType = selectMimeType(req.headers['Accept'])
  unless mimeType
    throw new HttpError(406, { 'Content-Type': 'text/plain' }, "Not capable of generating content according to the Accept header")

  feedbackVars = parseFeedbackVars(req)
  delete feedbackVars.event_id
  feedbackVars


parseFeedbackVars = (req) ->
  method = req.method?.toLowerCase()

  # parse the query string
  uri = url.parse(req.uri, true)
  query = flat.unflatten(uri.query)

  if method == 'get'
    query

  else if (method == 'post')

    if req.headers['Content-Length']? or req.headers['Transfer-Encoding'] == 'chunked'
      # assume a request body

      # ensure a content type header
      contentType = req.headers['Content-Type']
      unless contentType
        throw new HttpError(415, {'Content-Type': 'text/plain'}, 'Content-Type header is required')

      # ensure valid mime type
      mimeType = selectMimeType(req.headers['Content-Type'])
      unless supportedMimeTypeLookup[mimeType]?
        throw new HttpError(406, {'Content-Type': 'text/plain'}, "MIME type in Content-Type header is not supported. Use only #{supportedMimeTypes.join(', ')}.")

      # parse request body according the the mime type
      body = req.body?.trim()
      return query unless body
      try
        parsed = mimecontent(body, mimeType)
      catch e
        throw new HttpError(400, { 'Content-Type': 'text/plain' }, "Body is not parsable as #{mimeType} -- #{e.message}")

      # if form URL encoding, convert dot notation keys
      if mimeType == 'application/x-www-form-urlencoded'
        parsed = flat.unflatten(parsed)

      # if XML, turn doc into an object
      if mimeType == 'application/xml' or mimeType == 'text/xml'
        try
          parsed = parsed.toObject(explicitArray: false, explicitRoot: false, mergeAttrs: true)
        catch e
          xmlError = e.toString().replace(/\r?\n/g, " ")
          throw new HttpError(400, {'Content-Type': 'text/plain'}, "Body does not contain XML or XML is unparseable -- #{xmlError}.")

      # merge query string data into data parsed from request body
      _.merge(parsed, query)

      parsed

    else
      # assume no request body
      query




request.variables = ->
  [
    {
      name: 'type'
      label: 'Feedback type'
      type: 'string'
      description: 'The type of feedback being given'
      examples: ['return', 'conversion']
    }
    {
      name: 'reason'
      label: 'Feedback reason'
      type: 'string'
      description: 'The reason the feedback is being given'
      examples: ['Disconnected phone', 'Wrong number', 'Uncontactable', 'New customer']
    }
  ]


#
# Response Function ------------------------------------------------------
#

response = (req, vars, fieldIds = ['outcome', 'reason', 'lead.id', 'lead.first_name', 'lead.last_name', 'lead.email', 'lead.phone_1']) ->
  mimeType = selectMimeType(req.headers['Accept'])

  rtn = {}
  for field in fieldIds
    rtn[field] = dotaccess.get(vars, field)?.valueOf()
  rtn = flat.unflatten(rtn)

  body =
    if mimeType == 'application/xml' or mimeType == 'text/xml'
      xmlbuilder.create(result: rtn).end(pretty: true)
    else if mimeType == 'application/json'
      JSON.stringify(rtn)
    else
      lines = []
      for fieldName, fieldValue of rtn
        lines.push "#{fieldName.replace(/./g, '_')}:#{fieldValue ? ''}"
      lines.join('\n')

  headers =
    'Content-Type': mimeType,
    'Content-Length': Buffer.byteLength(body)

  status: 201
  headers: headers
  body: body


response.variables = ->
  [
    { name: 'outcome', type: 'string', description: 'The outcome of the feedback request (default is success, meaning that the feedback was accepted)' }
    { name: 'reason', type: 'string', description: 'If the outcome was a failure, this is the reason' }
    { name: 'lead.id', type: 'string', description: 'The lead identifier' }
    { name: 'lead.first_name', type: 'string', description: 'The consumer\'s first name' }
    { name: 'lead.last_name', type: 'string', description: 'The consumer\'s last name' }
    { name: 'lead.email', type: 'string', description: 'The consumer\'s email address' }
    { name: 'lead.phone_1', type: 'string', description: 'The consumer\'s phone number' }
  ]

#
# Helpers ----------------------------------------------------------------
#

selectMimeType = (contentType) ->
  contentType = contentType or 'application/json'
  contentType = 'application/json' if contentType == '*/*'
  mimeparse.bestMatch(supportedMimeTypes, contentType)




#
# Exports ----------------------------------------------------------------
#

module.exports =
  name: 'Standard Feedback'
  request: request,
  response: response
