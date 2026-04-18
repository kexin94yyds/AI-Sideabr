#!/usr/bin/env node

const {
  getMarkdownBaseDirDetails,
  sanitizeFileName,
  upsertConversationMarkdown
} = require('./conversation-markdown.cjs');

function writeNativeMessage(message) {
  const json = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(header);
  process.stdout.write(json);
}

function fail(error) {
  writeNativeMessage({
    success: false,
    error: error instanceof Error ? error.message : String(error)
  });
}

async function handleMessage(message) {
  try {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message payload');
    }

    if (message.type === 'ping') {
      const baseDirDetails = getMarkdownBaseDirDetails();
      writeNativeMessage({
        success: true,
        type: 'pong',
        baseDir: baseDirDetails.baseDir,
        baseDirSource: baseDirDetails.source,
        riConfigPath: baseDirDetails.riConfigPath || null,
        riExportLocalPath: baseDirDetails.riExportLocalPath || null
      });
      return;
    }

    if (message.type === 'syncConversation') {
      const conversation = message.conversation;
      const projectName = sanitizeFileName(message.project || conversation?.project || 'AI-Sidebar', 'AI-Sidebar');

      if (!conversation || !Array.isArray(conversation.messages) || conversation.messages.length === 0) {
        throw new Error('conversation.messages is required');
      }

      const result = upsertConversationMarkdown(projectName, conversation);
      const baseDirDetails = getMarkdownBaseDirDetails();
      writeNativeMessage({
        success: true,
        type: 'syncConversation',
        project: projectName,
        baseDir: baseDirDetails.baseDir,
        baseDirSource: baseDirDetails.source,
        riConfigPath: baseDirDetails.riConfigPath || null,
        riExportLocalPath: baseDirDetails.riExportLocalPath || null,
        ...result
      });
      return;
    }

    throw new Error(`Unsupported message type: ${message.type || 'unknown'}`);
  } catch (error) {
    fail(error);
  }
}

let buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (buffer.length >= 4) {
    const messageLength = buffer.readUInt32LE(0);
    if (buffer.length < messageLength + 4) break;

    const rawMessage = buffer.slice(4, messageLength + 4).toString('utf8');
    buffer = buffer.slice(messageLength + 4);

    try {
      const parsed = JSON.parse(rawMessage);
      handleMessage(parsed);
    } catch (error) {
      fail(error);
    }
  }
});

process.stdin.on('end', () => process.exit(0));
process.on('uncaughtException', fail);
process.on('unhandledRejection', fail);
