/*!
 * connect-mongo
 * Copyright(c) 2011 Casey Banner <kcbanner@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var Store = require('connect').session.Store;
var Mongolian = require('mongolian');
var url = require('url');

/**
 * Default options
 */

var defaultOptions = {host: '127.0.0.1',
    port: 27017,
    collection: 'sessions',
    clear_interval: -1};

/**
 * Initialize MongoStore with the given `options`.
 * Calls `callback` when db connection is ready (mainly for testing purposes).
 *
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

var MongoStore = module.exports = function MongoStore(options, callback) {
    options = options || {};
    Store.call(this, options);

    if (options.url) {
        var db_url = url.parse(options.url);

        if (db_url.port) {
            options.port = db_url.port;
        }

        if (db_url.pathname != undefined) {
            var pathname = db_url.pathname.split('/');

            if (pathname.length >= 2) {
                options.db = pathname[1];
            }

            if (pathname.length >= 3) {
                options.collection = pathname[2];
            }
        }

        if (db_url.hostname != undefined) {
            options.host = db_url.hostname;
        }

        if (db_url.auth != undefined) {
            var auth = db_url.auth.split(':');

            if (auth.length >= 1) {
                options.username = auth[0];
            }

            if (auth.length >= 2) {
                options.password = auth[1];
            }
        }
    }

    if (!options.db) {
        throw new Error('Required MongoStore option `db` missing');
    }


    this.mongolian = new Mongolian({ host: options.host || defaultOptions.host, port: options.port || defaultOptions.port});
    this.db = this.mongolian.db(options.db);
    this.collectionName = options.collection || defaultOptions.collection;
    this.collection = this.db.collection(this.collectionName);

};

/**
 * Inherit from `Store`.
 */

MongoStore.prototype.__proto__ = Store.prototype;

/**
 * Attempt to fetch session by the given `sid`.
 *
 * @param {String} sid
 * @param {Function} fn
 * @api public
 */
MongoStore.prototype.get = function(sid, callback) {


    this.collection.findOne({_id: sid}, function (err, session) {
        try {
            if (err) {
                callback && callback(err, null);
            }
            else {
                if (session) {
                    if (!session.expires || new Date() < session.expires) {
                        callback && callback(null, JSON.parse(session.session));
                    }
                    else {
                        self.destroy();
                    }
                }
                else {
                    callback && callback();
                }
            }
        }
        catch (err) {
            callback && callback(err);
        }

    });

};

/**
 * Commit the given `sess` object associated with the given `sid`.
 *
 * @param {String} sid
 * @param {Session} sess
 * @param {Function} fn
 * @api public
 */

MongoStore.prototype.set = function(sid, session, callback) {
    try {
        var s = {_id: sid, session: JSON.stringify(session)};

        if (session && session.cookie && session.cookie._expires) {
            s.expires = new Date(session.cookie._expires);
        }

        this.collection.save(s, function (err, value) {
            if (err) {
                callback && callback(err);
            }
            else {
                callback && callback(null);
            }
        });

    } catch (err) {
        callback && callback(err);
    }
};

/**
 * Destroy the session associated with the given `sid`.
 *
 * @param {String} sid
 * @api public
 */

MongoStore.prototype.destroy = function(sid, callback) {

    this.collection.remove({_id: sid}, function (err, value) {
        callback && callback();
    });

};

/**
 * Fetch number of sessions.
 *
 * @param {Function} fn
 * @api public
 */

MongoStore.prototype.length = function(callback) {

    this.collection.count(function (err, count) {
        if (err) {
            callback && callback(err);
        } else {
            callback && callback(null, count);
        }
    });

};

/**
 * Clear all sessions.
 *
 * @param {Function} fn
 * @api public
 */

MongoStore.prototype.clear = function(callback) {
    this.collection.remove({}, function ( err, value)
    {
        if ( err )
        {
            callback && calback(err);
        }
        else
        {
            callback && callback(null, value);
        }
    });
};
