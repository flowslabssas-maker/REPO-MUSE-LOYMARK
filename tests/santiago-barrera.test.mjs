import test from 'node:test';
import assert from 'node:assert/strict';
import {allowed,clientsForEmail,directAllowed} from '../api/_auth.js';
test('Santiago Barrera has named portal access with standard code login',()=>{
assert(allowed('santiago.barrera@loymark.com'));
assert.deepEqual(clientsForEmail('SANTIAGO.BARRERA@LOYMARK.COM'),['hero','xiaomi','area-andina']);
assert.equal(directAllowed('santiago.barrera@loymark.com'),false);
assert.equal(allowed('unapproved@loymark.com'),false);
});
