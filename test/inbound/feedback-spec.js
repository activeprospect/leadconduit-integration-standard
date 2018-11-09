const assert = require('chai').assert;
const integration = require('../../lib/inbound/feedback');



describe('Inbound feedback', () => {

  describe('request', () => {

    it('should not allow head', () => {
      assertMethodNotAllowed('head');
    });

    it('should not allow put', () => {
      assertMethodNotAllowed('put');
    });

    it('should not allow delete', () => {
      assertMethodNotAllowed('delete');
    });

    it('should not allow patch', () => {
      assertMethodNotAllowed('patch');
    });

    it('should handle GET', () => {
      const request = {
        uri: 'https://app.leadconduit.com/feedback?event_id=12345&type=return&reason=Wrong+number',
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };
      assert.deepEqual(integration.request(request), {
        type: 'return',
        reason: 'Wrong number'
      });
    });

    it('should handle form POST', () => {
      const body = 'type=return&reason=Wrong+number';
      const request = {
        uri: 'https://app.leadconduit.com/feedback?event_id=12345',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        body: body
      };
      assert.deepEqual(integration.request(request),{
        type: 'return',
        reason: 'Wrong number'
      });
    });

    it('should handle XML', () => {
      const body = `
        <feedback>
          <type>return</type>
          <reason>Wrong number</reason>
        </feedback>
        `;
      const request = {
        uri: 'https://app.leadconduit.com/feedback?event_id=12345',
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Accept': 'text/xml',
          'Content-Length': Buffer.byteLength(body)
        },
        body: body
      };
      assert.deepEqual(integration.request(request),{
        type: 'return',
        reason: 'Wrong number'
      });
    });

    it('should handle JSON', () => {
      const body = `
        {
          "type": "return",
          "reason": "Wrong number"
        }`;
      const request = {
        uri: 'https://app.leadconduit.com/feedback?event_id=12345',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        body: body
      };
      assert.deepEqual(integration.request(request),{
        type: 'return',
        reason: 'Wrong number'
      });


      it('should handle malformed XML', () => {
        const body = 'whatever';
        const request = {
          uri: 'https://app.leadconduit.com/feedback?event_id=12345',
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'Accept': 'text/xml',
            'Content-Length': Buffer.byteLength(body)
          },
          body: body
        };

        try {
          integration.request(request);
          assert.fail('expected an error to be thrown when xml content cannot be parsed');
        } catch (e) {
          assert.equal(e.status, 400);
          assert.equal(e.body, 'Body does not contain XML or XML is unparseable -- Error: Non-whitespace before first tag. Line: 0 Column: 1 Char: w.');
          assert.deepEqual(e.headers, {'Content-Type': 'text/plain'});
        }
      });


      it('should handle malformed JSON', () => {
        const body = 'whatever';

        const request = {
          uri: 'https://app.leadconduit.com/feedback?event_id=12345',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          },
          body: body
        };

        try {
          integration.request(request);
          assert.fail('expected an error to be thrown when JSON content cannot be parsed');
        } catch (e) {
          assert.equal(e.status, 400);
          assert.equal(e.body, 'Body is not parsable as application/json -- Unexpected token w in JSON at position 0');
          assert.deepEqual(e.headers, {'Content-Type': 'text/plain'});
        }
      });
    });

    describe('response', () => {

      let vars = null;

      beforeEach(() => {
        vars = {
          lead: {
            id: '123',
            email: 'foo@bar.com'
          },
          price: 1.5,
          outcome: 'failure',
          reason: 'bad!'
        };
      });

      it('should respond with json', () => {
        const res = integration.response(baseRequest('application/json'), vars);
        assert.equal(res.status, 201);
        assert.deepEqual(res.headers, {'Content-Type': 'application/json', 'Content-Length': 91});
        assert.equal(res.body, '{"outcome":"failure","reason":"bad!","lead":{"id":"123","email":"foo@bar.com"},"price":1.5}');
      });

      it('should default to json', () => {
        const res = integration.response(baseRequest('*/*'), vars);
        assert.equal(res.status, 201);
        assert.deepEqual(res.headers['Content-Type'],  'application/json');
      });

      it('should return 409 when feedback is disabled', () => {
        vars.reason = 'Feedback is forbidden';
        const res = integration.response(baseRequest('*/*'), vars);
        assert.equal(res.status, 409);
      });

      it('should respond with text xml', () => {
        const res = integration.response(baseRequest('text/xml'), vars);
        assert.equal(res.status, 201);
        assert.deepEqual(res.headers, {'Content-Type': 'text/xml', 'Content-Length': 231});
        assert.equal(res.body, '<?xml version="1.0"?>\n<result>\n  <outcome>failure</outcome>\n  <reason>bad!</reason>\n  <lead>\n    <id>123</id>\n    <first_name/>\n    <last_name/>\n    <email>foo@bar.com</email>\n    <phone_1/>\n  </lead>\n  <price>1.5</price>\n</result>');
      });

      it('should respond with application xml', () => {
        const res = integration.response(baseRequest(), vars);
        assert.equal(res.status, 201);
        assert.deepEqual(res.headers, {'Content-Type': 'application/xml', 'Content-Length': 231});
        assert.equal(res.body, '<?xml version="1.0"?>\n<result>\n  <outcome>failure</outcome>\n  <reason>bad!</reason>\n  <lead>\n    <id>123</id>\n    <first_name/>\n    <last_name/>\n    <email>foo@bar.com</email>\n    <phone_1/>\n  </lead>\n  <price>1.5</price>\n</result>');
      });
    });

    describe('With specified fields in response', () => {

      let vars = {};

      beforeEach(() => {
        vars = {
          lead: {
            id: '123',
            email: 'foo@bar.com'
          },
          outcome: 'failure',
          reason: 'bad!'
        };
      });

      it('should respond with json', () => {
        const res = integration.response(baseRequest('application/json'), vars, ['outcome', 'lead.id', 'lead.email']);
        assert.equal(res.status, 201);
        assert.equal(res.headers['Content-Type'], 'application/json');
        assert.equal(res.body, '{"outcome":"failure","lead":{"id":"123","email":"foo@bar.com"}}');
      });

      it('should respond with text xml', () => {
        const res = integration.response(baseRequest('text/xml'), vars, ['outcome', 'lead.id', 'lead.email']);
        assert.equal(res.status, 201);
        assert.equal(res.headers['Content-Type'], 'text/xml');
        assert.equal(res.body, '<?xml version="1.0"?>\n<result>\n  <outcome>failure</outcome>\n  <lead>\n    <id>123</id>\n    <email>foo@bar.com</email>\n  </lead>\n</result>');
      });

      it('should respond with application xml', () => {
        const res = integration.response(baseRequest(), vars, ['outcome', 'lead.id', 'lead.email']);
        assert.equal(res.status, 201);
        assert.equal(res.headers['Content-Type'], 'application/xml');
        assert.equal(res.body, '<?xml version="1.0"?>\n<result>\n  <outcome>failure</outcome>\n  <lead>\n    <id>123</id>\n    <email>foo@bar.com</email>\n  </lead>\n</result>');
      });
    });
  });
});

const baseRequest = (accept = null, querystring = '') => {
  return {
    uri: `/whatever${querystring}`,
    method: 'post',
    version: '1.1',
    headers: {
      'Accept': accept || 'application/xml',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'first_name=Joe',
    timestamp: new Date().getTime()
  };
};

const assertMethodNotAllowed = (method) => {
  try {
    integration.request({method: method});
    assert.fail(`expected ${method} to throw an error`);
  } catch (e) {
    assert.equal(e.status, 415);
    assert.equal(e.body, `The ${method.toUpperCase()} method is not allowed`);
    assert.deepEqual(e.headers,{
      'Allow': 'GET, POST',
      'Content-Type': 'text/plain'
    });
  }
};
