This is nothing more than the [code](scp2-github) of the [scp2 NPM module](scp2-npm).

We ended up embedding it because this module requires an antique version of the [ssh2 module](ssh2-module) which 
[broke support for ed25519 SSH key format](ssh2-github-issue). 

By using it's code directly, we can use the scp2 functionality with ssh2 >= 0.8.3 which brings support for the ed25519 
key format.

[scp2-github]:       https://github.com/spmjs/node-scp2
[scp2-npm]:          https://www.npmjs.com/package/scp2
[ssh2-npm]:          https://www.npmjs.com/package/ssh2
[ssh2-github-issue]: https://github.com/mscdex/ssh2/issues/352#issuecomment-486511390
