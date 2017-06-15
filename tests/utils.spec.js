import { describe, it } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';
import async from 'async';

import utils from '../src/utils';



describe('ReversePath', function () {

    it('should have getReversePath method', function () {
        assert.property(utils, 'getReversePath');
    });

    it('test a/b/c', function () {
        let results = utils.getReversePath('a/b/c');
        assert.equal(results, '../../..');
    });
    it('test a/b/c/', function () {
        let results = utils.getReversePath('a/b/c/');
        assert.equal(results, '../../../');
    });
    it('test a/b', function () {
        let results = utils.getReversePath('a/b');
        assert.equal(results, '../..');
    });
    it('test a/b/', function () {
        let results = utils.getReversePath('a/b/');
        assert.equal(results, '../../');
    });
    it('test a/', function () {
        let results = utils.getReversePath('a/');
        assert.equal(results, '../');
    });
    it('test a', function () {
        let results = utils.getReversePath('a');
        assert.equal(results, '..');
    });
    it('test /a', function () {
        let results = utils.getReversePath('/a');
        assert.equal(results, '/..');
    });
    it('test /a/', function () {
        let results = utils.getReversePath('/a/');
        assert.equal(results, '/../');
    });

});


describe('realpath', function () {

    it('should have realpath method', function () {
        assert.property(utils, 'realpath');
    });

    it('test /a/../c', function () {
        let results = utils.realpath('/a/../c');
        assert.equal(results, '/c');
    });

    it('test /a/b/../c', function () {
        let results = utils.realpath('/a/b/../c');
        assert.equal(results, '/a/c');
    });

    it('test /a/b/c/..', function () {
        let results = utils.realpath('/a/b/c/..');
        assert.equal(results, '/a/b');
    });

    it('test /a/b/c/./..', function () {
        let results = utils.realpath('/a/b/c/./..');
        assert.equal(results, '/a/b');
    });


});

