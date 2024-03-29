# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [4.0.1] - 2022-06-02
### Fixed
  - Bug introduced in 4.0.0 that broke deploying in archive mode


## [4.0.0] - 2022-06-02 [YANKED]
### Breaking change
  - fix the `remote.upload()` function (fixes [#29], closes [#30], thanks [@xstable]). 
  Read [the documentation](https://github.com/la-haute-societe/ssh-deploy-release#context-object) for more details
### Added
  - Ability to provide a custom connection using the `onBeforeConnect` callback
  - Ability to use the password authentication feature of ssh2 (see [#27] thanks [@Sibyx])
### Updated
  - Bump ssh2 to 1.10.0


## [3.0.5] - 2021-06-24
## [3.0.4] - 2020-02-27
## [3.0.3] - 2020-01-28
## [3.0.2] - 2020-01-28
## [3.0.1] - 2020-01-16
## [3.0.0] - 2019-10-23

[#27]: https://github.com/la-haute-societe/ssh-deploy-release/issues/27
[#29]: https://github.com/la-haute-societe/ssh-deploy-release/issues/29
[#30]: https://github.com/la-haute-societe/ssh-deploy-release/pull/30
[@xstable]: https://github.com/xstable
[@Sibyx]: https://github.com/Sibyx

[Unreleased]: https://github.com/la-haute-societe/ssh-deploy-release/compare/4.0.0...HEAD
[4.0.0]: https://github.com/la-haute-societe/ssh-deploy-release/compare/3.0.5...4.0.0
[3.0.5]: https://github.com/la-haute-societe/ssh-deploy-release/compare/3.0.4...3.0.5
[3.0.4]: https://github.com/la-haute-societe/ssh-deploy-release/compare/3.0.3...3.0.4
[3.0.3]: https://github.com/la-haute-societe/ssh-deploy-release/compare/3.0.2...3.0.3
[3.0.2]: https://github.com/la-haute-societe/ssh-deploy-release/compare/3.0.1...3.0.2
[3.0.1]: https://github.com/la-haute-societe/ssh-deploy-release/compare/3.0.0...3.0.1
[3.0.0]: https://github.com/la-haute-societe/ssh-deploy-release/releases/tag/3.0.0
