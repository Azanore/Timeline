// Shared typedefs (JSDoc) placeholder
// Use these typedefs across the app to keep props consistent.

/**
 * @typedef {Object} PartialDate
 * @property {number} year
 * @property {number} [month]
 * @property {number} [day]
 * @property {number} [hour]
 * @property {number} [minute]
 */

/**
 * @typedef {Object} EventModel
 * @property {string} id
 * @property {string} title
 * @property {string} [body]
 * @property {'history'|'personal'|'science'|'culture'|'tech'|'other'} type
 * @property {PartialDate} start
 * @property {PartialDate} [end]
 */

/**
 * @typedef {Object} TimelineModel
 * @property {string} id
 * @property {string} name
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number} version
 * @property {EventModel[]} events
 */

export {};
