import type { SkmtcParsedDocument, OasOperation } from '@skmtc/core'
import { OperationDoc } from '../../src/snippets/OperationDoc.ts'
import { toGenerateContext } from './toGenerateContext.ts'

type ToOperationDocumentArgs = {
  parsed: SkmtcParsedDocument
  operation: OasOperation
}

/**
 * An operation's whole Markdown document, as the transform writes it: the
 * document, then the types it references. Inserts the {@link OperationDoc}
 * projection into a fresh context and renders the file it lands in.
 */
export const toOperationDocument = ({ parsed, operation }: ToOperationDocumentArgs): string => {
  const context = toGenerateContext({ oasDocument: parsed })
  const document = context.insertOperation({ projection: OperationDoc, operation })
  const file = context.getFile(document.toExportPath())

  if (file === undefined) {
    throw new Error(`no document at ${document.toExportPath()}`)
  }

  return file.toString()
}
