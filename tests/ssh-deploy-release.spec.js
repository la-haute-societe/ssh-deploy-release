import { describe, it } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';
import async from 'async';

import Deployer from '../src/ssh-deploy-release';
import Options from '../src/Options';
import Release from '../src/Release';



describe('API', function () {

    it('should have deployRelease method', function () {
        let deployer = new Deployer({});
        assert.property(deployer, 'deployRelease');
    });

    it('should have removeRelease method', function () {
        let deployer = new Deployer({});
        assert.property(deployer, 'removeRelease');
    });
});


describe('Options', function () {

    it('should set default options', function () {
        let deployer       = new Deployer({});
        let defaultOptions = Options.defaultOptions();
        assert.deepEqual(deployer.options, defaultOptions);
    });

    it('should override default options', function () {
        let deployer = new Deployer({
            debug: true
        });
        assert.equal(deployer.options.debug, true);
    });
});


describe('Release', function () {

    it('should instance release object', function () {
        let deployer = new Deployer({});
        assert.property(deployer, 'release');
        assert.instanceOf(deployer.release, Release);
    });

    it('should have a tag (string)', function () {
        let deployer = new Deployer({
            tag: 'test'
        });
        assert.equal(deployer.release.tag, 'test');
    });

    it('should have a tag (function)', function () {
        let deployer = new Deployer({
            tag: () => {
                return 'test'
            }
        });
        assert.equal(deployer.release.tag, 'test');
    });

    it('should have a tag even if not defined', function () {
        let deployer = new Deployer({
            tag: ''
        });
        assert.notEqual(deployer.release.tag, '');
    });

    it('should have a path', function () {
        let deployer = new Deployer({
            deployPath: 'deployPath',
            releaseFolder: 'releaseFolder',
            tag: 'tag'
        });
        assert.equal(deployer.release.path, 'deployPath/releases/tag');
    });
});

describe('Deploy - Tasks', function () {

    it('should call all required tasks', function (done) {
        const requiredTasks = [
            'onBeforeDeployTask',
            'onBeforeDeployExecuteTask',
            'compressReleaseTask',
            'connectToRemoteTask',
            'createReleaseFolderOnRemoteTask',
            'uploadArchiveTask',
            'uploadReleaseTask',
            'decompressArchiveOnRemoteTask',
            'onBeforeLinkTask',
            'onBeforeLinkExecuteTask',
            'updateSharedSymbolicLinkOnRemoteTask',
            'createFolderTask',
            'makeDirectoriesWritableTask',
            'makeFilesExecutableTask',
            'updateCurrentSymbolicLinkOnRemoteTask',
            'onAfterDeployTask',
            'onAfterDeployExecuteTask',
            'remoteCleanupTask',
            'deleteLocalArchiveTask',
            'closeConnectionTask',
        ];

        let deployer = new Deployer();

        const stubs = requiredTasks.map(taskName => {
            let stub = sinon.stub(deployer, taskName).yieldsAsync();
            return {
                stub: stub,
                name: taskName
            };
        });

        deployer.deployRelease(() => {
            stubs.forEach(stub => {
                assert(stub.stub.called, stub.name + ' method not called');
                stub.stub.restore();
            });
            done();
        });
    });

});


describe('Remove release - Tasks', function () {

    it('should call all required tasks', function (done) {
        const requiredTasks = [
            'connectToRemoteTask',
            'removeReleaseTask',
            'closeConnectionTask',
        ];

        let deployer = new Deployer();

        const stubs = requiredTasks.map(taskName => {
            let stub = sinon.stub(deployer, taskName).yieldsAsync();
            return {
                stub: stub,
                name: taskName
            };
        });

        deployer.removeRelease(() => {
            stubs.forEach(stub => {
                assert(stub.stub.called, stub.name + ' method not called');
                stub.stub.restore();
            });
            done();
        });
    });

});



describe('Deploy - Middleware callbacks', function () {

    [
        'onBeforeDeploy',
        'onBeforeLink',
        'onAfterDeploy',
    ].forEach(taskName => {
        it('should call ' + taskName + ' middleware callback', function (done) {
            const spy         = sinon.spy(function (context, done) {
                done();
            });
            let options       = {};
            options[taskName] = spy;
            const deployer    = new Deployer(options);

            deployer[taskName + 'Task'](() => {
                assert(spy.calledOnce, taskName + 'callback not called once');
                done();
            });
        });
    });


    [
        'onBeforeDeployExecute',
        'onBeforeLinkExecute',
        'onAfterDeployExecute',
    ].forEach(taskName => {

        it('should call ' + taskName + ' middleware callback - no command', function (done) {
            const deployer = new Deployer();
            deployer[taskName + 'Task'](done);
        });

        it('should call ' + taskName + ' middleware callback - function return no command', function (done) {
            const spy = sinon.spy(function (context) {
                return [];
            });

            let options       = {};
            options[taskName] = spy;
            const deployer    = new Deployer(options);
            deployer[taskName + 'Task'](() => {
                assert(spy.calledOnce);
                done();
            });
        });

        it('should call ' + taskName + ' middleware callback - function return command', function (done) {
            let options       = {};
            options[taskName] = function (context) {
                return ['first'];
            };
            const deployer    = new Deployer(options);
            deployer.logger.setEnabled(false);

            const stub = sinon.stub(deployer.remote, 'exec');

            deployer[taskName + 'Task'](() => {
                done();
            });
            stub.callArg(1);
        });

        it('should call ' + taskName + ' middleware callback -  array command', function (done) {
            let options       = {};
            options[taskName] = ['first'];
            const deployer    = new Deployer(options);
            deployer.logger.setEnabled(false);

            const stub = sinon.stub(deployer.remote, 'exec');

            deployer[taskName + 'Task'](() => {
                done();
            });
            stub.callArg(1);
        });
    });
});


describe('Deploy - archive', function () {

    it('should instanciate Archiver', function (done) {

        const deployer = new Deployer({
            mode : 'archive'
        });
        deployer.logger.setEnabled(false);

        let spy = sinon.spy(deployer, 'createArchiver');

        deployer.compressReleaseTask(() => {
            assert(spy.called, 'Archive mode should create archive');
            done();
        })
    });

    it('should upload archive', function (done) {

        const deployer = new Deployer({
            mode : 'archive'
        });
        deployer.logger.setEnabled(false);

        let stub = sinon.stub(deployer.remote, 'upload');

        deployer.uploadArchiveTask(() => {
            assert(stub.called, 'Archive mode should upload archive');
            done();
        });

        stub.callArg(2);
    });

    it('should decompress archive on remote', function(done) {

        const deployer = new Deployer({
            mode: 'archive'
        });
        deployer.logger.setEnabled(false);

        let stub = sinon.stub(deployer.remote, 'exec');

        deployer.decompressArchiveOnRemoteTask(() => {
            assert(stub.called, 'Synchronize mode should decompress archive on remote');
            done();
        });

        stub.callArg(1);
    });
});



describe('Deploy - synchronize', function () {
    it('should not instanciate Archiver', function (done) {

        const deployer = new Deployer({
            mode : 'synchronize'
        });
        deployer.logger.setEnabled(false);

        let spy = sinon.spy(deployer, 'createArchiver');

        deployer.compressReleaseTask(() => {
            assert(spy.notCalled, 'Synchronize mode should not compress archive');
            done();
        })
    });

    it('should not upload archive', function (done) {

        const deployer = new Deployer({
            mode : 'synchronize'
        });
        deployer.logger.setEnabled(false);

        let stub = sinon.stub(deployer.remote, 'upload');

        deployer.uploadArchiveTask(() => {
            assert(stub.notCalled, 'Synchronize mode should not upload archive');
            done();
        });

        stub.callArg(2);
    });

    it('should not decompress archive on remote', function(done) {

        const deployer = new Deployer({
            mode: 'synchronize'
        });
        deployer.logger.setEnabled(false);

        let stub = sinon.spy(deployer.remote, 'exec');

        deployer.decompressArchiveOnRemoteTask(() => {
            assert(stub.notCalled, 'Synchronize mode should not decompress archive on remote');
            done();
        });
    });
});






describe('Deploy - Remote', function () {
    it('should not able connection without credential', function () {

        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

            assert.throw(
                () => {
                deployer.connectToRemoteTask(() => {
                    assert(spy.called);
                })
            }
        )
    });
});



describe('Deploy - Shared symlinks', function () {

    it('should not create shared symlinks', function (done) {
        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

        const createSymboliclinkStub = sinon.stub(deployer.remote, 'createSymboliclink');

        deployer.updateSharedSymbolicLinkOnRemoteTask(() => {
            assert(createSymboliclinkStub.notCalled, 'Should call Remote.createSymboliclink method');
            done();
        });

        createSymboliclinkStub.callArg(2);
    });


    // Test multiple config
    [
        //
        {
            share: {
                'target' : 'link'
            }
        },
        //
        {
            share: {
                'target' : {
                    'symlink' : 'link'
                }
            }
        },
    ].forEach(config => {
        it('should create shared symlinks', function (done) {

            const deployer = new Deployer(config);
            deployer.logger.setEnabled(false);

            const createSymboliclinkStub = sinon.stub(deployer.remote, 'createSymboliclink');
            const chmodStub = sinon.stub(deployer.remote, 'chmod');

            deployer.updateSharedSymbolicLinkOnRemoteTask(() => {
                assert(createSymboliclinkStub.called, 'Should call Remote.createSymboliclink method');
                assert(chmodStub.notCalled, 'Should not call Remote.chmod method');
                done();
            });

            createSymboliclinkStub.callArg(2);
        });
    });


    it('should create shared symlinks and set chmod', function (done) {

        const deployer = new Deployer({
            share: {
                'target' : {
                    symlink: 'link',
                    mode: '0777'
                }
            }
        });
        deployer.logger.setEnabled(false);

        const createSymboliclinkStub = sinon.stub(deployer.remote, 'createSymboliclink');
        const chmodStub = sinon.stub(deployer.remote, 'chmod');

        deployer.updateSharedSymbolicLinkOnRemoteTask(() => {
            assert(createSymboliclinkStub.called, 'Should call Remote.createSymboliclink method');
            assert(chmodStub.called, 'Should call Remote.chmod method');
            done();
        });

        createSymboliclinkStub.callArg(2);
        chmodStub.callArg(2);
    });

});

describe('Deploy - create folder', function() {
    it('should not create folder on remote', function (done) {

        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

        const createFolderStub = sinon.stub(deployer.remote, 'createFolder');

        deployer.createFolderTask(() => {
            assert(createFolderStub.notCalled, 'Should not call Remote.createFolder method');
            done();
        });

        createFolderStub.callArg(1);
    });

    it('should create folder on remote', function (done) {

        const deployer = new Deployer({
            create: ['test']
        });
        deployer.logger.setEnabled(false);

        const createFolderStub = sinon.stub(deployer.remote, 'createFolder');

        deployer.createFolderTask(() => {
            assert(createFolderStub.called, 'Should call Remote.createFolder method');
            done();
        });

        createFolderStub.callArg(1);
    });
});


describe('Deploy - make writable folder', function() {
    it('should not make writable folder on remote', function (done) {

        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

        const chmodStub = sinon.stub(deployer.remote, 'chmod');

        deployer.makeDirectoriesWritableTask(() => {
            assert(chmodStub.notCalled, 'Should not call Remote.chmod method');
            done();
        });

        chmodStub.callArg(2);
    });

    it('should make writable folder on remote', function (done) {

        const deployer = new Deployer({
            makeWritable: ['test']
        });
        deployer.logger.setEnabled(false);

        const chmodStub = sinon.stub(deployer.remote, 'chmod');

        deployer.makeDirectoriesWritableTask(() => {
            assert(chmodStub.called, 'Should call Remote.chmod method');
            done();
        });

        chmodStub.callArg(2);
    });

});

describe('Deploy - make file executable', function() {
    it('should not make file executable on remote', function (done) {
        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

        const execStub = sinon.stub(deployer.remote, 'exec');

        deployer.makeFilesExecutableTask(() => {
            assert(execStub.notCalled, 'Should not call Remote.exec method');
            done();
        });

        execStub.callArg(1);
    });

    it('should make file executable on remote', function (done) {
        const deployer = new Deployer({
            makeExecutable: ['test']
        });
        deployer.logger.setEnabled(false);

        const execStub = sinon.stub(deployer.remote, 'exec');

        deployer.makeFilesExecutableTask(() => {
            assert(execStub.called, 'Should call Remote.exec method');
            done();
        });

        execStub.callArg(1);
    });
});


describe('Deploy - update currente symlink', function() {
    it('should update current symlink on remote', function (done) {
        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

        const createSymboliclinkStub = sinon.stub(deployer.remote, 'createSymboliclink');

        deployer.updateCurrentSymbolicLinkOnRemoteTask(() => {
            assert(createSymboliclinkStub.called, 'Should call Remote.createSymboliclink method');
            done();
        });

        createSymboliclinkStub.callArg(2);
    });
});

describe('Clean up on remote', function() {
    it('should clean up releases on remote', function (done) {
        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

        const removeOldFoldersStub = sinon.stub(deployer.remote, 'removeOldFolders');

        deployer.remoteCleanupTask(() => {
            assert(removeOldFoldersStub.called, 'Should call Remote.removeOldFolders method');
            done();
        });

        removeOldFoldersStub.callArg(2);
    });
});

describe('Delete local archive', function() {
    it('should delete local archive', function (done) {
        const deployer = new Deployer();
        deployer.logger.setEnabled(false);

        const fs = require('fs');
        const unlinkStub = sinon.stub(fs, 'unlinkSync');

        deployer.deleteLocalArchiveTask(() => {
            assert(unlinkStub.called, 'Should call fs.unlink method');
            unlinkStub.restore();
            done();
        });
    });

    it('should not delete local archive on synchronize mode', function (done) {
        const deployer = new Deployer({
            mode: 'synchronize'
        });
        deployer.logger.setEnabled(false);

        const fs = require('fs');
        const unlinkStub = sinon.stub(fs, 'unlinkSync');

        deployer.deleteLocalArchiveTask(() => {
            assert(unlinkStub.notCalled, 'Should call fs.unlink method');
            unlinkStub.restore();
            done();
        });
    });

    it('should not delete local archive on synchronize mode', function (done) {
        const deployer = new Deployer({
            mode: 'archive',
            deleteLocalArchiveAfterDeployment: false,
        });
        deployer.logger.setEnabled(false);

        const fs = require('fs');
        const unlinkStub = sinon.stub(fs, 'unlinkSync');

        deployer.deleteLocalArchiveTask(() => {
            assert(unlinkStub.notCalled, 'Should call fs.unlink method');
            unlinkStub.restore();
            done();
        });
    });
});



