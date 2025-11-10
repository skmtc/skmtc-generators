<div align="left">
  <img alt="Skmtc logo" src="assets/skmtc.svg">
  <br />
  <br />
</div>

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-zod)
![GitHub License](https://img.shields.io/github/license/skmtc/skmtc-generators)

# OpenAPI to Zod schema generator for [Skmtc](https://skm.tc).

## Installation

Install Deno

```bash
# On MacOS/Linus
curl -fsSL https://deno.land/install.sh | sh

# On Windows
irm https://deno.land/install.ps1 | iex
```

Install Skmtc

```bash
deno install -g -A --unstable-worker-options jsr:@skmtc/cli@0.0.388 -n skmtc -f
```

## Create project and generate artifacts using TUI (recommended)

```bash
# Create project then Generate artifacts 
skmtc
```

<p align="center" width="100%">
<video src="assets/create-project.mp4" width="80%" controls></video>
</p>

[![Watch the video](https://img.youtube.com/vi/T-D1KVIuvjA/maxresdefault.jpg)](https://assets.skm.tc/create-project.mp4)

<p align="center" width="100%">
<video src="assets/generate-artifacts.mp4" width="80%" controls></video>
</p>

## Create project and generate artifacts using CLI

```bash
# Create project
skmtc init <project name>

# Install zod generator 
skmtc install @skmtc/gen-zod <project name>

# Bundle generator code
skmtc bundle <project name>

# Generate artifacts from OpenAPI schema
skmtc generate <project name> <path or url to openapi schema>
```

## Support

- For help and support please use [Discord](https://discord.gg/Mg88C8Xu5Y)
- For bug report and technical issues use [Github issues](https://github.com/skmtc/skmtc/issues)
- Full docs coming to [Skmtc](https://skm.tc) very soon

## License

[MIT](LICENSE)