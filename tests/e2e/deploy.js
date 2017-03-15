'use strict';

const Deployer = require('../../dist/ssh-deploy-release');


const options = {
    //mode: 'synchronize',
    localPath: 'src',
    host: '79.137.72.16',
    username: 'stagingsnd',
    password: 'wn1RnzXDvUOA5tKUKPGL',
    deployPath: '/var/www/vhosts/staging.soundboard.top/httpdocs/test',
    share: {
        test: {
            symlink: 'test',
            mode: '0777'
        },
        'coucou' : 'coucou'
    },
    create: [
        'a', 'b'
    ],
    makeWritable: [
        'a'
    ],
    onAfterDeploy: (context, callback) => {
        context.logger.subhead('Ls remote');
        context.remote.exec('ls -la ' + context.options.deployPath, callback, true);
    },
    onAfterDeployExecute: (context) => {
        context.logger.subhead('Ls remote');
        return [
            'ls -la ' + context.options.deployPath
        ]
    }
};

// const deployer = new Deployer(options);
// deployer.deployRelease(() => {
// });


console.log('ReMOVE __________');
const deployerRemove = new Deployer(options);
deployerRemove.removeRelease(() => {
});
