const assert = require('chai').assert;
const integration = require('../../lib/inbound/verbose');
const types = require('leadconduit-types');

describe('Inbound Verbose Response', () => {

  beforeEach(() => {
    this.vars = {
      outcome: 'success',
      lead: {
        id: '1234'
      },
      appended: {
        briteverify: {
          email: {
            status: 'valid',
            disposable: 'false',
            role_address: 'false',
            outcome: 'success'
          }
        }
      },
      price: 1.5
    };
  });

  it('should set appended fields correctly in JSON response', () => {
    const req = {
      uri: 'http://example.com',
      headers: {
        'Accept': 'application/json'
      }
    };
    const expected = {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 174
      },
      body: '{"appended":{"briteverify":{"email":{"status":"valid","disposable":"false","role_address":"false","outcome":"success"}}},"outcome":"success","lead":{"id":"1234"},"price":1.5}'
    };
    assert.deepEqual(integration.response(req, this.vars), expected);
  });


  it('should set appended fields correctly in XML response', () => {
    const req = {
      uri: 'http://example.com',
      headers: {
        'Accept': 'application/xml'
      }
    };
    const expected = {
      status: 201,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': 380
      },
      body: '<?xml version="1.0"?>\n<result>\n  <appended>\n    <briteverify>\n      <email>\n        <status>valid</status>\n        <disposable>false</disposable>\n        <role_address>false</role_address>\n        <outcome>success</outcome>\n      </email>\n    </briteverify>\n  </appended>\n  <outcome>success</outcome>\n  <reason/>\n  <lead>\n    <id>1234</id>\n  </lead>\n  <price>1.5</price>\n</result>'
    };
    assert.deepEqual(integration.response(req, this.vars), expected);
  });


  it('should respond correctly when no fields are appended', () => {
    const req = {
      uri: 'http://example.com',
      headers: {
        'Accept': 'application/json'
      }
    };
    const vars = {
      outcome: 'success',
      lead: {
        id: '1234'
      }
    };
    const expected = {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 52
      },
      body: '{"outcome":"success","lead":{"id":"1234"},"price":0}'
    };
    assert.deepEqual(integration.response(req, vars), expected);
  });


  it('should respond correctly with rich appended fields', () => {
    const req = {
      uri: 'http://example.com',
      headers: {
        'Accept': 'application/xml'
      }
    };
    const vars = {
      outcome: 'success',
      lead: {
        id: '1234'
      },
      price: 1.5,
      appended: {
        briteverify: {
          email: {
            status: 'valid',
            disposable: types.boolean.parse('false'),
            role_address: types.boolean.parse('false'),
            outcome: 'success',
            billable: types.number.parse('1')
          }
        }
      }
    };
    const expected = {
      status: 201,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': 411
      },
      body: '<?xml version="1.0"?>\n<result>\n  <appended>\n    <briteverify>\n      <email>\n        <status>valid</status>\n        <disposable>false</disposable>\n        <role_address>false</role_address>\n        <outcome>success</outcome>\n        <billable>1</billable>\n      </email>\n    </briteverify>\n  </appended>\n  <outcome>success</outcome>\n  <reason/>\n  <lead>\n    <id>1234</id>\n  </lead>\n  <price>1.5</price>\n</result>'
    };
    assert.deepEqual(integration.response(req, vars), expected);
  });
});
