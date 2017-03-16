'use strict';

const Deployer = require('../../dist/ssh-deploy-release');


const options = {
    debug: true,
    localPath: 'src',
    host: 'my.server.com',
    username: 'username',
    password: 'password',
    deployPath: '/var/deploy/path',

    share: {
        'target-folder': 'link-name'
    },
    create: [
        'this-folder', 'and-this'
    ],
    makeWritable: [
        'this-file'
    ],
    onAfterDeployExecute: (context) => {
        context.logger.subhead('Remote ls');
        return [
            'ls -la ' + context.options.deployPath
        ]
    }
};

const deployer = new Deployer(options);
deployer.deployRelease();


// const deployerRemove = new Deployer(options);
// deployerRemove.removeRelease();
