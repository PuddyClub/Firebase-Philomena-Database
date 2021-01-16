module.exports = function (data) {

    // Lodash Module
    const _ = require('lodash');

    // Config
    const tinyCfg = _.defaultsDeep({}, data.config, {
        key: '',
        timeout: 10,
        pages: 1,
        query: '*',
        filter_id: 56027,
        per_page: 50
    });

    // Config Key
    if(
        (typeof tinyCfg.key === "string" && tinyCfg.key.length > 0) ||
        (typeof tinyCfg.key === "number" && !isNaN(tinyCfg.key))
    ){
        tinyCfg.key = '&key=' + encodeURIComponent(tinyCfg.key);
    } else {
        tinyCfg.key = '';
    }

    // Create Settings
    const booru_settings = _.defaultsDeep({}, data.module, {

        // ID
        id: 'derpibooru',

        // DB
        db: {
            type: 'ref',
            data: null
        },

        // Byte Limit
        byteLimit: {

            // JSON
            json: {

                // Tag
                tag: 1048576,

                // Error
                error: 1048576

            }

        }
    });

    // Main Config
    const mainConfig = {
        name: 'Derpibooru',
        url: 'https://derpibooru.org',
        module_name: 'derpibooru_http_api_v1',
        tagListVar: 'tags',
        idVar: 'id',
    };

    // Config Fusion
    for (const item in mainConfig) {
        booru_settings[item] = mainConfig[item];
    }

    // Booru
    const booruDatabase = require('@tinypudding/firebase-booru-database');

    // Derpibooru
    const derpibooru = new booruDatabase(booru_settings);

    // Prepare Module
    const items_to_use = {};

    // Run Code
    items_to_use.run = function () {
        return new Promise(async function (resolve, reject) {

            // Try Get
            try {

                // Get Errors
                const errorResult = await derpibooru.checkError();

                // Check Timeout
                if (!errorResult.error) {

                    // Fetch
                    const fetch = require('node-fetch');

                    // Image List
                    const image_list = [];
                    let total_images = 0;

                    await require('for-promise')({ data: tinyCfg.pages }, function (item, fn, fn_error) {

                        // Page
                        const page = item + 1;

                        // Response
                        fetch(`${mainConfig.url}/api/v1/json/search/images?q=${encodeURIComponent(tinyCfg.query)}&filter_id=${encodeURIComponent(tinyCfg.filter_id)}&page=${String(page)}&per_page=${encodeURIComponent(tinyCfg.per_page)}${tinyCfg.key}`).then(response => {

                            // Search Items
                            response.json().then(result => {

                                // Get Total Result
                                total_images = result.total;

                                // Check Results
                                if (Array.isArray(result.images) && result.images.length > 0 && typeof result.total === "number" && result.total > 0) {
                                    for (const image in result.images) {
                                        image_list.push(result.images[image]);
                                    }
                                }

                                // Complete
                                fn();
                                return;

                            }).catch(err => {
                                fn_error(err);
                                return;
                            });

                            // Complete
                            return;

                        }).catch(err => {
                            fn_error(err);
                            return;
                        });

                        // Complete
                        return;

                    });

                    // Exist Data
                    if (Array.isArray(image_list) && image_list.length > 0 && typeof total_images === "number" && total_images > 0) {
                        await derpibooru.getDBItem('itemTotal').set(total_images)
                        errorResult.data = await derpibooru.updateDatabase(image_list);
                    }

                }

                // Nope
                else {
                    errorResult.data.timeout--;
                    await derpibooru.setErrorTimeout(errorResult.data.timeout);
                }

                // Send Result
                resolve(errorResult);

            }

            // Error
            catch (err) {

                // Send Error
                try {
                    await derpibooru.error({ message: err.message, timeout: tinyCfg.timeout });
                    reject(err);
                }

                // Error Again
                catch (err2) {
                    reject(err2);
                }

            }

            // Complete
            return;

        });
    };

    // Get Object
    items_to_use.getRoot = function () {
        return derpibooru;
    };

    // Complete
    return items_to_use;

};