const assert = require('chai').assert;
const integration = require('../../lib/inbound/classic');

describe('Classic Inbound Response', () => {

  beforeEach(() => {
    this.vars = {
      lead: { id: '123' },
      outcome: 'Failure',
      reason: 'bad!'
    };
  });


  it('should respond with 201', () => {
    const res = integration.response(baseRequest('application/json'), this.vars);
    assert.deepEqual(res.status, 201);
  });

  it('should respond with xml', () => {
    const res = integration.response(baseRequest('application/json'), this.vars);
    assert.deepEqual(res.headers, {'Content-Type': 'application/xml', 'Content-Length': 264});
  });

  it('should correctly parse failure outcome', () => {
    const res = integration.response(baseRequest('application/json'), this.vars);
    assert.deepEqual(res.body, nonSuccessBody);
  });

  it('should correctly parse success outcome', () => {
    this.vars.outcome = 'Success';
    this.vars.price = 1.5;
    delete this.vars.reason;

    const res = integration.response(baseRequest('application/json'), this.vars);
    assert.deepEqual(res.body, successBody);
  });

  it('should capture price variable', () => {
    this.vars.outcome = 'Success';
    delete this.vars.reason;
    this.vars.price = 1.5;

    const res = integration.response(baseRequest('application/json'), this.vars);
    assert.deepEqual(res.body, successBody);
  });
});


const baseRequest = (accept = null, querystring = '') => {
  return {
    uri: `/whatever${querystring}`,
    method: 'post',
    version: '1.1',
    headers: {
      'Accept': accept || 'application/xml',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'first_name=Joe',
    timestamp: new Date().getTime()
  };
};

const successBody = `<!DOCTYPE response SYSTEM "https://app.leadconduit.com/dtd/response-v2-basic.dtd">
<response>
  <result>Success</result>
  <leadId>123</leadId>
  <url>
    <![CDATA[https://app.leadconduit.com/leads?id=123]]>
  </url>
  <price>1.5</price>
</response>`;

const nonSuccessBody = `<!DOCTYPE response SYSTEM "https://app.leadconduit.com/dtd/response-v2-basic.dtd">
<response>
  <result>Failure</result>
  <reason>bad!</reason>
  <leadId>123</leadId>
  <url>
    <![CDATA[https://app.leadconduit.com/leads?id=123]]>
  </url>
  <price/>
</response>`;
