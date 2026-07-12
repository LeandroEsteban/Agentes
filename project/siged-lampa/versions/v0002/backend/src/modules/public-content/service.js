const { AppError } = require('../../shared/errors');
const { transaction } = require('../../database/transaction');
const repository = require('./repository');
const audit = require('../audit/service');

const publicList = async (kind, page) => (await repository[{ news: 'publicNews', notices: 'publicNotices', calendar: 'publicCalendar' }[kind]](page)).rows;
const publicNews = async (slug) => {
    const item = (await repository.publicNewsBySlug(slug)).rows[0];
    if (!item) throw new AppError(404, 'NEWS_NOT_FOUND', 'Noticia no encontrada');
    return item;
};
const adminList = async (kind) => (await repository.adminList({ news: 'news_posts', notices: 'public_notices', calendar: 'calendar_events' }[kind])).rows;

async function save(kind, id, value, actor, requestId, ipAddress) {
    const map = { news: ['createNews', 'updateNews', 'news_post'], notices: ['createNotice', 'updateNotice', 'public_notice'], calendar: ['createCalendar', 'updateCalendar', 'calendar_event'] };
    const [create, update, entityType] = map[kind];
    return transaction(async (db) => {
        const item = (await (id ? repository[update](db, id, value) : repository[create](db, value, actor.id))).rows[0];
        if (!item) throw new AppError(404, 'PUBLIC_CONTENT_NOT_FOUND', 'Contenido no encontrado');
        await audit.write(db, audit.event(`public_content_${id ? 'updated' : 'created'}`, 'M07', entityType, item.id, actor, requestId, ipAddress, { kind, status: item.status }));
        return item;
    });
}

module.exports = { publicList, publicNews, adminList, save };
