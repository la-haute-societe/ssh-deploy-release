'use strict';

const Deployer = require('../../dist/ssh-deploy-release');
const server = require('./server-config');


const options = {
    localPath: 'src',
    host: server.host,
    username: server.username,
    password: server.password,
    deployPath: '/var/www/vhosts/test/httpdocs',
    // mode:'archive',
    // archiveType: 'zip',
    debug: true,

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
