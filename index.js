module.exports = {
  inbound: require('./lib/inbound'),
  outbound: {
    to_flow: require('./lib/outbound/to_flow')
  }
};
