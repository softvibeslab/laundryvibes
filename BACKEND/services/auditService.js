const AuditEvent = require('../models/auditEvent');

const safeMetadata = (metadata = {}) => Object.fromEntries(
  Object.entries(metadata).filter(([key, value]) => (
    !/password|secret|token|authorization|evidence/i.test(key)
    && ['string', 'number', 'boolean'].includes(typeof value)
  )),
);

function httpContext(req) {
  return {
    actor: { id: req.user?.userId, role: req.user?.role || 'system' },
    origin: {
      ip: String(req.ip || '').slice(0, 100),
      userAgent: String(req.get?.('user-agent') || '').slice(0, 300),
      channel: 'http',
    },
  };
}

async function recordAudit({ action, target, metadata, actor, origin, session }) {
  const event = {
    action,
    target,
    actor: actor || { role: 'system' },
    origin: origin || { channel: 'cli' },
    metadata: safeMetadata(metadata),
  };
  if (!session) return AuditEvent.create(event);
  const created = await AuditEvent.create([event], { session });
  return Array.isArray(created) ? created[0] : created;
}

async function auditHttp(req, action, target, metadata, { actor, session } = {}) {
  return recordAudit({ action, target, metadata, ...httpContext(req), actor, session });
}

module.exports = { auditHttp, recordAudit, safeMetadata };
