'use strict';

const Deployer = require('../../dist/ssh-deploy-release');


const options = {
    localPath: 'src',
    host: 'my.server.com',
    username: 'username',
    password: 'password',
    deployPath: '/var/www/vhosts/staging.soundboard.top/httpdocs/test',
    share: {
        'target-folder' : 'link-name'
    },
    create: [
        'this-folder', 'and-this'
    ],
    makeWritable: [
        'this-file'
    ],
    onAfterDeployExecute: (context) => {
        context.logger.subhead('Ls remote');
        return [
            'ls -la ' + context.options.deployPath
        ]
    }
};

const deployer = new Deployer(options);
    deployer.deployRelease(() => {
});


console.log('ReMOVE __________');
const deployerRemove = new Deployer(options);
deployerRemove.removeRelease(() => {
});
