const assert = require('chai').assert;
const integration = require('../../lib/outbound/to_flow');
const types = require('leadconduit-types');

describe('Request', () => {

  it('should correctly format request', () => {
    let vars = {
      url: 'https://next.leadconduit.com/flows/556f14adefb63c4a34a606fa/sources/576d813b135284e25350cb85/submit',
      lead: {
        first_name: 'John',
        last_name: 'Smith',
        company: {
          name: 'ActiveProspect'
        }
      }
    };
    vars.lead.email = types.email.parse('test@activeprospect.com');
    let expected = {
      body: 'first_name=John&last_name=Smith&company.name=ActiveProspect&email=test%40activeprospect.com',
      url: 'https://next.leadconduit.com/flows/556f14adefb63c4a34a606fa/sources/576d813b135284e25350cb85/submit',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    assert.deepEqual(integration.request(vars), expected);
  });

  it('should correctly send custom fields', () => {
    let vars = {
      url: 'https://next.leadconduit.com/flows/556f14adefb63c4a34a606fa/sources/576d813b135284e25350cb85/submit',
      lead: {
        first_name: 'John',
        last_name: 'Smith',
      },
      custom: {
        favorite_color: 'blue'
      }
    };
    let expected = {
      body: 'first_name=John&last_name=Smith&favorite_color=blue',
      url: 'https://next.leadconduit.com/flows/556f14adefb63c4a34a606fa/sources/576d813b135284e25350cb85/submit',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    assert.deepEqual(integration.request(vars), expected);
  });
});

describe('Response', () => {

  it('should handle success correctly', ()=> {
    let res = {
      status: 201,
      body: JSON.stringify({
        outcome: 'success',
        lead: {
          id: '5b15bc8bd3cab54d442bb717'
        }
      })
    };
    let expected = {
      outcome: 'success',
      reason: undefined,
      lead: {
        id: '5b15bc8bd3cab54d442bb717'
      }
    };
    assert.deepEqual(integration.response(undefined, undefined, res), expected);
  });

  it('should handle failure correctly', ()=> {
    let res = {
      status: 201,
      body: JSON.stringify({
        outcome: 'failure',
        reason: 'duplicate email address',
        lead: {
          id: '5b15bc8bd3cab54d442bb717'
        }
      })
    };
    let expected = {
      outcome: 'failure',
      reason: 'duplicate email address',
      lead: {
        id: '5b15bc8bd3cab54d442bb717'
      }
    };
    assert.deepEqual(integration.response(undefined, undefined, res), expected);
  });

});

describe('Validate', () => {

  it('should skip when url is missing', () => {
    let vars = {
      lead: {
        email: 'test@activeprospect.com'
      }
    };
    assert.equal(integration.validate(vars), 'URL must not be blank');
  });

  it('should skip when url is not a LeadConduit url', () => {
    let vars = {
      url: 'https://google.com',
      lead: {
        email: 'test@activeprospect.com'
      }
    };
    assert.equal(integration.validate(vars), 'URL must be a valid LeadConduit posting URL');
  });

  it('should not skip when a valid url is provided', () => {
    let vars = {
      url: 'https://next.leadconduit.com/flows/556f14adefb63c4a34a606fa/sources/576d813b135284e25350cb85/submit',
      lead: {
        email: 'test@activeprospect.com'
      }
    };
    assert.isUndefined(integration.validate(vars));
  });

});