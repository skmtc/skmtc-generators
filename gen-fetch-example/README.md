# @skmtc/gen-fetch-example

The example generator from the Skmtc docs. It writes one `fetch` function
per GET or POST operation without path parameters, and takes one setting,
`baseUrl`, for the whole generator or for a single operation.

It exists to be read and cloned, not to be used in production:

```sh
skmtc clone -g @skmtc/gen-fetch-example <project>
```
