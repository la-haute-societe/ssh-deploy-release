'use strict';

const Deployer = require('../../dist/ssh-deploy-release');
const server = require('./server-config');


const options = {
    localPath: 'tests/e2e/folder-to-deploy',
    host: server.host,
    username: server.username,
    password: server.password,
    deployPath: '/var/www/vhosts/test/httpdocs',

    debug: true,

    share: {
        'target-folder': 'link-name',
    },
    create: [
        'this-folder', 'and-this', 'this-file'
    ],
    makeWritable: [
        'this-file'
    ],
    onAfterDeployExecute: (context) => {
        context.logger.subhead('Remote ls');
        return [
            'ls -la ' + context.options.deployPath
        ]
    },
    exclude: ['exclude-this/**']
};


const deployer = new Deployer(options);
deployer.deployRelease();


// const deployerRemove = new Deployer(options);
// deployerRemove.removeRelease();
