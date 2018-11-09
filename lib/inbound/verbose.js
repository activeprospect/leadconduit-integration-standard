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

  fieldIds.push('outcome', 'reason', 'lead.id', 'price');

  return inbound.response(req, vars, fieldIds);
};

response.variables = inbound.response.variables;

module.exports = {
  name: 'Standard Verbose',
  request: inbound.request,
  response: response
};
