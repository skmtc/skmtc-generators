<div align="left">
  <img alt="Skmtc logo" src="assets/skmtc.svg">
  <br />
  <br />
</div>

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-zod)
![GitHub License](https://img.shields.io/github/license/skmtc/skmtc-generators)

# OpenAPI to Zod schema generator for [Skmtc](https://skm.tc).

- Fast: Github OpenAPI to Zod in 0.5sec [(9.5x faster than Orval)](https://github.com/skmtc/openapi-codegen-benchmarks)
- Modular: Use by itself or combine with other [Skmtc generators](https://github.com/skmtc/skmtc-generators)
- Flexible: Customise output code by editing string templates not ASTs

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

https://github.com/user-attachments/assets/375aedde-aed8-42a3-bd13-3004f736dee7

https://github.com/user-attachments/assets/c830e57a-4767-46e3-b27e-e518c9f6b0d7

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
