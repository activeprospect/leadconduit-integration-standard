const inbound = require('leadconduit-default').inbound;
const flat = require('flat');
const _ = require('lodash');

const response = (req, vars) => {
  let fieldIds = [];
  if (vars.appended) {
    // only send appended fields, but those need to be under an appended object to have the correct fieldId
    const appended = { appended: vars.appended };
    fieldIds = _.keys(flat.flatten(appended, {safe: true}));
  }

  fieldIds.push('outcome', 'reason', 'lead.id');

  return inbound.response(req, vars, fieldIds);
};

response.variables = () => [
  { name: 'lead.id', type: 'string', description: 'The lead identifier that the source should reference' },
  { name: 'outcome', type: 'string', description: 'The outcome of the transaction (default is success)' },
  { name: 'reason', type: 'string', description: 'If the outcome was a failure, this is the reason' }
];

module.exports = {
  name: 'Standard Verbose',
  request: inbound.request,
  response: response
};
