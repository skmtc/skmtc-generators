# @skmtc/gen-typescript

![Coverage](https://coveralls.io/repos/github/skmtc/skmtc-generators/badge.svg?branch=main&flag=gen-typescript)

OpenAPI to TypeScript types generator for [Skmtc](https://skm.tc).

## Advanced Type Support

- ✅ Discriminated unions with automatic detection
- ✅ Records and `additionalProperties` handling
- ✅ Proper optional/nullable modifiers
- ✅ String enums and literals
- ✅ Complex nested objects and arrays
- ✅ Reference resolution across schemas

## Quick start

Run deployed generator
```bash
# Using npx
npx skmtc generate @skmtc/typescript <path or url to OpenAPI schema>

# Using deno
deno run -A jsr:@skmtc/cli generate @skmtc/typescript <path or url to OpenAPI schema>
```

## Installation

Add `@skmtc/gen-typescript` to a Skmtc project

```bash
# Using npx
npx skmtc install @skmtc/gen-typescript

# Using deno
deno run -A jsr:@skmtc/cli install @skmtc/gen-typescript
```

## Running locally

To run Skmtc generators on your own computer, you will first need to install Deno

```bash
# On MacOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# On Windows
irm https://deno.land/install.ps1 | iex
```

To create a new Skmtc project with `@skmtc/gen-typescript`, run the install command. 

The prompt will ask you to create a new project and give it name.

```bash
npx skmtc install @skmtc/gen-typescript

deno run -A jsr:@skmtc/cli install @skmtc/gen-typescript
```

To launch a local generator server, run the command below with the project
name you created in previous step.

```bash
# Using deno
deno run -A jsr:@skmtc/cli serve <project name>

# Skmtc server cannot be run using npx or Node
```

With the generator server now running, open a new terminal tab and
run the Skmtc generate command. The cli will prompt you for OpenAPI
source schema path or url.

```bash 
# Using npx
npx skmtc generate <project name>

# Using deno
deno run -A jsr:@skmtc/cli generate <project name>
```

## Testing

```bash
# Run tests
deno task test

# Generate HTML coverage report
deno task coverage:html
```

## Support

- For help and support please use [Discord](https://discord.gg/Mg88C8Xu5Y)
- For bug report and technical issues use [Github issues](https://github.com/skmtc/skmtc/issues)
- Full docs coming to [Skmtc](https://skm.tc) very soon

## License

[MIT](LICENSE)