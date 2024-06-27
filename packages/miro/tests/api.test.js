const {Authenticator} = require('@friggframework/test');
const {Api} = require('../api');
const config = require('../defaultConfig.json');
const {promises: fs} = require("fs");

const mockDir = `./mocks${Date.now()}`
const parsedBody = async function async(resp) {
    const contentType = resp.headers.get('Content-Type') || '';
    let body;
    if (
        contentType.match(/^application\/json/) ||
        contentType.match(/^application\/vnd.api\+json/) ||
        contentType.match(/^application\/hal\+json/)
    ) {
        body = await resp.json();
    } else {
        body = await resp.text();
    }
    await fs.writeFile(`./${mockDir}/${this.lastCalled}.json`, JSON.stringify(body));
    return body;
}

describe(`${config.label} API tests`, () => {
    const apiParams = {
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        redirect_uri: `${process.env.REDIRECT_URI}/hubspot`,
        scope: process.env.HUBSPOT_SCOPE
    };
    Object.getOwnPropertyNames(Api.prototype).forEach(f => {
        if (f !== 'constructor' &&
            typeof Api.prototype[f] === 'function' &&
            f !== 'addJsonHeaders' &&
            !f.startsWith('_')) {
            const old = Api.prototype[f];
            Api.prototype[f] = function (...args) {
                this.lastCalled = f;
                return old.apply(this, args);
            }
        }
    })
    const api = new Api(apiParams);
    api.parsedBody = parsedBody;
    beforeAll(async () => {
        await fs.mkdir(mockDir, {recursive: true});
    });

    beforeAll(async () => {
        const url = await api.getAuthUri();
        const response = await Authenticator.oauth2(url);
        const baseArr = response.base.split('/');
        response.entityType = baseArr[baseArr.length - 1];
        delete response.base;

        await api.getTokenFromCode(response.data.code);
    });

    const testObjType = 'tests';

    describe('HS User Info', () => {
        it('should return the user details', async () => {
            const response = await api.getUserDetails();
            expect(response).toHaveProperty('portalId');
            expect(response).toHaveProperty('token');
            expect(response).toHaveProperty('app_id');
        });
    });

    // Skipping tests... inherited with bugs, needs refactor
    describe.skip('HS Deals', () => {
        it('should return a deal by id', async () => {
            const deal_id = '2022088696';
            const response = await api.getDealById(deal_id);
            expect(response.id).toBe(deal_id);
            expect(response.properties.amount).to.eq('100000');
            expect(response.properties.dealname).to.eq('Test');
            expect(response.properties.dealstage).to.eq('appointmentscheduled');
        });

        it('should return all deals of a company', async () => {
            let response = await api.listDeals();
            expect(response.results[0]).toHaveProperty('id');
            expect(response.results[0]).toHaveProperty('properties');
            expect(response.results[0].properties).toHaveProperty('amount');
            expect(response.results[0].properties).toHaveProperty('dealname');
            expect(response.results[0].properties).toHaveProperty('dealstage');
        });
    });

    // Some tests skipped ... inherited with bugs, needs refactor
    describe('HS Companies', () => {
        let createRes;
        beforeAll(async () => {
            const body = {
                domain: 'gitlab.com',
                name: 'Gitlab',
            };
            createRes = await api.createCompany(body);
        });

        afterAll(async () => {
            await api.archiveCompany(createRes.id);
        });

        it('should create a Company', async () => {
            expect(createRes.properties.domain).toBe('gitlab.com');
            expect(createRes.properties.name).toBe('Gitlab');
        });

        it('should return the company info', async () => {
            const company_id = createRes.id;
            const response = await api.getCompanyById(company_id);
            expect(response.id).toBe(company_id);
            // expect(response.properties.domain).to.eq('golabstech.com');
            // expect(response.properties.name).to.eq('Golabs');
        });

        it('should list Companies', async () => {
            const response = await api.listCompanies();
            expect(response.results[0]).toHaveProperty('id');
            expect(response.results[0]).toHaveProperty('properties');
            expect(response.results[0].properties).toHaveProperty('domain');
            expect(response.results[0].properties).toHaveProperty('name');
            expect(response.results[0].properties).toHaveProperty(
                'hs_object_id'
            );
        });

        it('should update Company', async () => {
            const body = {
                properties: {
                    name: 'Facebook 1',
                }
            };
            const response = await api.updateCompany(
                createRes.id,
                body
            );
            expect(response.properties.name).toBe('Facebook 1');
        });

        it('should search for a company', async () => {
            // case sensitive search of default searchable properties
            // website, phone, name, domain
            const body = {
                query: 'Facebook',
            };
            const response = await api.searchCompanies(body);
            expect(response.results[0]).toHaveProperty('id');
            expect(response.results[0]).toHaveProperty('properties');
            expect(response.results[0].properties).toHaveProperty('domain');
            expect(response.results[0].properties).toHaveProperty('name');
            expect(response.results[0].properties.name).toBe('Facebook 1');
        })

        it('should delete a company', async () => {
            // Hope the after works!
        });
    });

    // Skipping tests... inherited with bugs, needs refactor
    describe.skip('HS Companies BATCH', () => {
        let createResponse;
        beforeAll(async () => {
            const body = [
                {
                    properties: {
                        domain: 'gitlab.com',
                        name: 'Gitlab',
                    },
                },
                {
                    properties: {
                        domain: 'facebook.com',
                        name: 'Facebook',
                    },
                },
            ];
            createResponse = await api.createABatchCompanies(body);
        });

        afterAll(async () => {
            return createResponse.results.map(async (company) => {
                return api.deconsteCompany(company.id);
            });
        });

        it('should create a Batch of Companies', async () => {
            const results = _.sortBy(createResponse.results, [
                function (o) {
                    return o.properties.name;
                },
            ]);
            expect(createResponse.status).toBe('COMPCONSTE');
            expect(results[0].properties.name).toBe('Facebook');
            expect(results[0].properties.domain).toBe('facebook.com');
            expect(results[1].properties.name).toBe('Gitlab');
            expect(results[1].properties.domain).toBe('gitlab.com');
        });

        it('should update a Batch of Companies', async () => {
            const body = [
                {
                    properties: {
                        name: 'Facebook 2',
                    },
                    id: createResponse.results[0].id,
                },
                {
                    properties: {
                        name: 'Gitlab 2',
                    },
                    id: createResponse.results[1].id,
                },
            ];
            const response = await api.updateBatchCompany(body);

            const results = _.sortBy(response.results, [
                function (o) {
                    return o.properties.name;
                },
            ]);
            expect(response.status).toBe('COMPCONSTE');
            expect(results[0].properties.name).toBe('Facebook 2');
            expect(results[1].properties.name).toBe('Gitlab 2');
        });
    });

    // Some tests skipped ... inherited with bugs, needs refactor
    describe('HS Contacts', () => {
        let createResponse;

        it('should create a Contact', async () => {
            const body = {
                email: 'jose.miguel@hubspot.com',
                firstname: 'Miguel',
                lastname: 'Delgado',
            };
            createResponse = await api.createContact(body);
            expect(createResponse).toHaveProperty('id');
            expect(createResponse.properties.firstname).toBe('Miguel');
            expect(createResponse.properties.lastname).toBe('Delgado');
        });

        it('should list Contacts', async () => {
            let response = await api.listContacts();
            expect(response.results[0]).toHaveProperty('id');
            expect(response.results[0]).toHaveProperty('properties');
            expect(response.results[0].properties).toHaveProperty('firstname');
        });

        it('should update a Contact', async () => {
            let properties = {
                lastname: 'Johnson (Sample Contact) 1',
            };
            let response = await api.updateContact(
                createResponse.id,
                properties,
            );
            expect(response.properties.lastname).toBe(
                'Johnson (Sample Contact) 1'
            );
        });

        it('should delete a contact', async () => {
            let response = await api.archiveContact(createResponse.id);
            expect(response.status).toBe(204);
        });
    });

    // Skipping tests... inherited with bugs, needs refactor
    describe.skip('HS Contacts BATCH', () => {
        let createResponse;
        beforeAll(async () => {
            let body = [
                {
                    properties: {
                        email: 'jose.miguel3@hubspot.com',
                        firstname: 'Miguel',
                        lastname: 'Delgado',
                    },
                },
                {
                    properties: {
                        email: 'jose.miguel2@hubspot.com',
                        firstname: 'Miguel',
                        lastname: 'Delgado',
                    },
                },
            ];
            createResponse = await api.createbatchContacts(body);
        });

        afterAll(async () => {
            createResponse.results.forEach(async (contact) => {
                await api.deleteContact(contact.id);
            });
        });

        it('should create a batch of Contacts', async () => {
            let results = _.sortBy(createResponse.results, [
                function (o) {
                    return o.properties.email;
                },
            ]);
            expect(createResponse.status).toBe('COMPLETE');
            expect(results[0].properties.email).toBe(
                'jose.miguel2@hubspot.com'
            );
            expect(results[0].properties.firstname).toBe('Miguel');
        });

        it('should update a batch of Contacts', async () => {
            let body = [
                {
                    properties: {
                        firstname: 'Miguel 3',
                    },
                    id: createResponse.results[0].id,
                },
                {
                    properties: {
                        firstname: 'Miguel 2',
                    },
                    id: createResponse.results[1].id,
                },
            ];

            let response = await api.updateBatchContact(body);
            let results = _.sortBy(response.results, [
                function (o) {
                    return o.properties.firstname;
                },
            ]);
            expect(response.status).toBe('COMPLETE');
            expect(results[0].properties.firstname).toBe('Miguel 2');
            expect(results[1].properties.firstname).toBe('Miguel 3');
        });
    });

    describe('HS Landing Pages', () => {
        let allLandingPages;
        it('should return the landing pages', async () => {
            allLandingPages = await api.getLandingPages();
            expect(allLandingPages).toBeDefined();
        });
        let primaryLandingPages
        it('should return only primary language landing pages', async () => {
            primaryLandingPages = await api.getLandingPages('translatedFromId__is_null');
            expect(primaryLandingPages).toBeDefined();
        });
        let variationLandingPages;
        let sampleLandingPage;
        it('should return only variation language landing pages', async () => {
            variationLandingPages = await api.getLandingPages('translatedFromId__not_null');
            expect(variationLandingPages).toBeDefined();
            sampleLandingPage = variationLandingPages.results.slice(-1)[0];
            expect(sampleLandingPage.id).toBeDefined();
        });
        it('confirm total landing pages', async () => {
            expect(allLandingPages.total).toBe(primaryLandingPages.total + variationLandingPages.total)
        });

        it('get Landing Page by Id', async () => {
            const response = await api.getLandingPage(sampleLandingPage.id);
            expect(response).toBeDefined();
        });
        it('update a Landing page (maximal patch)', async () => {
            delete sampleLandingPage['archivedAt'];
            const response = await api.updateLandingPage(
                sampleLandingPage.id,
                sampleLandingPage,
                true);
            expect(response).toBeDefined();
        });
        it('update a Landing page (minimal patch)', async () => {
            const response = await api.updateLandingPage(
                sampleLandingPage.id,
                {htmlTitle: `test Landing page ${Date.now()}`},
                true);
            expect(response).toBeDefined();
        });
        it('publish a Landing Page', async () => {
            const now = new Date(Date.now() + 5000);
            const response = await api.publishLandingPage(
                sampleLandingPage.id,
                now.toISOString(),
            );
            expect(response).toBeDefined();
        });
        it('push a Landing page draft to live', async () => {

            const response = await api.pushLandingPageDraftToLive(sampleLandingPage.id);
            expect(response).toBeDefined();
        });
    });

    describe('HS Site Pages', () => {
        let allSitePages;
        it('should return the Site pages', async () => {
            allSitePages = await api.getSitePages();
            expect(allSitePages).toBeDefined();
        });
        let primarySitePages
        it('should return only primary language Site pages', async () => {
            primarySitePages = await api.getSitePages('translatedFromId__is_null');
            expect(primarySitePages).toBeDefined();
        });
        let variationSitePages
        it('should return only variation language Site pages', async () => {
            variationSitePages = await api.getSitePages('translatedFromId__not_null');
            expect(variationSitePages).toBeDefined();
        });
        it('confirm total Site pages', async () => {
            expect(allSitePages.total).toBe(primarySitePages.total + variationSitePages.total)
        });
        it('get Site Page by Id', async () => {
            const pageToGet = primarySitePages.results.slice(-1)[0];
            const response = await api.getSitePage(pageToGet.id);
            expect(response).toBeDefined();
        });
        it('update a Site page', async () => {
            const pageToUpdate = variationSitePages.results.slice(-1)[0];
            const response = await api.updateSitePage(
                pageToUpdate.id,
                {htmlTitle: `test site page ${Date.now()}`},
                true);
            expect(response).toBeDefined();
        });
    });

    describe('HS Blog Posts', () => {
        let allBlogPosts;
        it('should return the Blog Posts', async () => {
            allBlogPosts = await api.getBlogPosts();
            expect(allBlogPosts).toBeDefined();
        });
        let primaryBlogPosts
        it('should return only primary language Blog Posts', async () => {
            primaryBlogPosts = await api.getBlogPosts('translatedFromId__is_null');
            expect(primaryBlogPosts).toBeDefined();
        });
        let variationBlogPosts
        it('should return only variation language Blog Posts', async () => {
            variationBlogPosts = await api.getBlogPosts('translatedFromId__not_null');
            expect(variationBlogPosts).toBeDefined();
        });
        it('confirm total Blog Posts', async () => {
            expect(allBlogPosts.total).toBe(primaryBlogPosts.total + variationBlogPosts.total)
        });
        it('get Blog Post by Id', async () => {
            const postToGet = primaryBlogPosts.results.slice(-1)[0];
            const response = await api.getBlogPost(postToGet.id);
            expect(response).toBeDefined();
        });
        it('update a Blog Post', async () => {
            const postToUpdate = primaryBlogPosts.results[0];
            const response = await api.updateBlogPost(
                postToUpdate.id,
                {htmlTitle: `test blog post ${Date.now()}`},
                true);
            expect(response).toBeDefined();
        });
    });

    describe('HS Email Templates', () => {
        let allEmailTemplates;
        it('should return the Email Templates', async () => {
            allEmailTemplates = await api.getEmailTemplates();
            expect(allEmailTemplates).toBeDefined();
            expect(allEmailTemplates).toHaveProperty('objects')
        });
        it('get Email Template by Id', async () => {
            const templateToGet = allEmailTemplates.objects.slice(-1)[0];
            const response = await api.getEmailTemplate(templateToGet.id);
            expect(response).toBeDefined();
        });
        it('update a Email Template', async () => {
            const postToUpdate = allEmailTemplates.objects.slice(-1)[0];
            const response = await api.updateEmailTemplate(
                postToUpdate.id,
                {label: `test email template ${Date.now()}`},
            );
            expect(response).toBeDefined();
        });
        let createdId;
        it('create an Email Template', async () => {
            const response = await api.createEmailTemplate(
                allEmailTemplates.objects.slice(-1)[0]
            );
            expect(response).toBeDefined();
            createdId = response.id;
        });
        it('Delete an Email Template', async () => {
            const response = await api.deleteEmailTemplate(createdId)
            expect(response.status).toBe(204);
        });
    });

    describe('Custom Object Schemas', () => {
        const testSchema = {
            "labels": {"singular": "Test Object", "plural": "Test Objects"},
            "requiredProperties": ["word"],
            "searchableProperties": ["word"],
            "primaryDisplayProperty": "word",
            "secondaryDisplayProperties": [],
            "description": null,
            "properties": [{
                "name": "word",
                "label": "Word",
                "type": "string",
                "fieldType": "text",
                "description": "",
                "hasUniqueValue": false
            }],
            "associatedObjects": [
                "COMPANY"
            ],
            "name": "test_object"
        }

        it('should return the Custom Object Schemas', async () => {
            const response = await api.listCustomObjectSchemas();
            expect(response).toBeDefined();
            expect(response).toHaveProperty('results');
            expect(response.results.length).toBeGreaterThan(0);
            expect(response.results.filter(s => s.name === testSchema.name).length).toBe(0);
        });

        it('should create a Custom Object Schema', async () => {
            const response = await api.createCustomObjectSchema(testSchema);
            expect(response).toBeDefined();
            expect(response).toHaveProperty('id');
        });

        it('Should get association labels', async () => {
            const labels = await api.getAssociationLabels('COMPANY', testSchema.name);
            expect(labels).toBeDefined();
            expect(labels.results).toHaveProperty('length');
            expect(labels.results.find(label => label.label === 'Primary')).toBeTruthy();
        })

        it('should delete a Custom Object Schema', async () => {
            const response = await api.deleteCustomObjectSchema(testSchema.name);
            expect(response.status).toBe(204);
        })
    })

    describe('HS Custom Objects', () => {
        let allCustomObjects;
        let oneWord;
        const createWord = 'Test Custom Object Create';
        const updateWord = 'Test Custom Object Update';
        it('should return the Custom Objects', async () => {
            allCustomObjects = await api.listCustomObjects(
                testObjType,
                {properties: 'word'}
            );
            expect(allCustomObjects).toBeDefined();
            expect(allCustomObjects).toHaveProperty('results')
            oneWord = allCustomObjects.results.find(o => o.properties.word === 'One');
        });
        it('get Custom Object by Id', async () => {
            const objectToGet = allCustomObjects.results.slice(-1)[0];
            const response = await api.getCustomObject(testObjType, objectToGet.id);
            expect(response).toBeDefined();
        });
        let createdObject;
        it('create a Custom Object', async () => {
            createdObject = await api.createCustomObject(
                testObjType,
                {
                    properties: {
                        word: createWord
                    }
                },
            );
            expect(createdObject).toBeDefined();
        })
        it('update a Custom Object', async () => {
            const response = await api.updateCustomObject(
                testObjType,
                createdObject.id,
                {
                    properties: {
                        word: updateWord
                    }
                },
            );
            expect(response).toBeDefined();
        });
        it('Search for custom object', async () => {
            // Search doesn't work on objects that were very recently created
            const response = await api.searchCustomObjects(
                testObjType,
                {
                    "query": 'One',
                    "filterGroups": [
                        {
                            "filters": [
                                {
                                    "propertyName": "word",
                                    "value": 'One',
                                    "operator": "EQ"
                                }
                            ]
                        }
                    ]
                }
            );
            expect(response).toBeDefined();
            expect(response.results).toHaveProperty('length');
            expect(response.results[0].id).toBe(oneWord.id);
        });
        it('delete a Custom Object', async () => {
            const response = await api.deleteCustomObject(testObjType, createdObject.id);
            expect(response.status).toBe(204);
        })

        // BATCH TESTS
        const batchSize = 100;
        let createdBatch;
        it('Should bulk create a batch of objects', async () => {
            const range = Array.from({length: batchSize}, (_, i) => i);
            const objectsToCreate = range.map(i => ({
                properties: {
                    word: `Test Bulk Create ${i}`
                },
            }))
            const response = await api.bulkCreateCustomObjects(
                testObjType,
                {inputs: objectsToCreate}
            );
            expect(response.results).toHaveProperty('length');
            expect(response.results.length).toBe(batchSize);
            createdBatch = response.results;
        })
        it('Should read a batch of objects', async () => {
            const inputs = createdBatch.map(o => {
                return {id: o.id}
            });
            const response = await api.bulkReadCustomObjects(
                testObjType,
                {
                    inputs,
                    properties: ['word']
                }
            );
            expect(response).toBeDefined();
            expect(response.results).toHaveProperty('length');
            expect(response.results.length).toBe(batchSize);
        });
        it('Should update a batch of objects', async () => {
            const inputs = createdBatch.map(o => {
                return {
                    id: o.id,
                    properties: {word: 'Test Update'}
                }
            });

            const response = await api.bulkUpdateCustomObjects(
                testObjType,
                {
                    inputs,
                }
            );
            expect(response).toBeDefined();
            expect(response.results).toHaveProperty('length');
            expect(response.results.length).toBe(batchSize);
        });
        it('Should delete a batch of objects', async () => {
            const inputs = createdBatch.map(o => {
                return {id: o.id}
            });
            const response = await api.bulkArchiveCustomObjects(
                testObjType,
                {
                    inputs
                }
            );
            expect(response).toBeDefined();
            expect(response).toBe("");
        });
        afterAll(async () => {
            // Search doesn't work on objects that were very recently created
            const response = await api.searchCustomObjects(
                testObjType,
                {
                    "query": 'Test',
                    "limit": 100,
                    "filterGroups": [
                        {
                            "filters": [
                                {
                                    "propertyName": "word",
                                    "value": 'Test',
                                    "operator": "CONTAINS_TOKEN"
                                }
                            ]
                        }
                    ]
                }
            );
            const inputs = response.results.map(o => {
                return {id: o.id}
            });
            await api.bulkArchiveCustomObjects(testObjType, {inputs});
        })
    })

    describe('HS List Requests', () => {
        it('Should get a list of lists', async () => {
            const response = await api.searchLists();
            expect(response).toBeDefined();
            expect(response.lists).toHaveProperty('length');
        });
        let createdListId;
        it('Should create a list', async () => {
            const {list} = await api.createList('Test List', '0-2');
            createdListId = list.listId;
        });
        it('Should get a list', async () => {
            const response = await api.getListById(createdListId);
            expect(response).toBeDefined();
            expect(response.list.listId).toBe(createdListId);
        })
        it('Should add a record to list', async () => {
            const companyResponse = await api.listCompanies();
            const someCompanyId = companyResponse.results[0].id;
            const response = await api.addToList(createdListId, [someCompanyId]);
            expect(response).toBeDefined();
            // HS has a typo in the response "recordsIds" instead of "recordIds"
            expect(response.recordsIdsAdded).toHaveLength(1);
        })
        it('Should remove all records from list', async () => {
            const response = await api.removeAllListMembers(createdListId);
            expect(response.status).toBe(204);
        })
        it('Should delete a list', async () => {
            const response = await api.deleteList(createdListId);
            expect(response).toBeDefined();
            expect(response.status).toBe(204);
        })
    });

    describe('Association Labels', () => {
        it('Should get association labels', async () => {
            const labels = await api.getAssociationLabels('COMPANY', 'CONTACT');
            expect(labels).toBeDefined();
            expect(labels.results).toHaveProperty('length');
            expect(labels.results.find(label => label.label && label.label.includes('Primary'))).toBeTruthy();
        })

        let createdBatch;
        let toCompany;
        beforeAll(async () => {
            const batchSize = 20;
            const range = Array.from({length: batchSize}, (_, i) => i);
            const objectsToCreate = range.map(i => ({
                properties: {
                    word: `Test Bulk Create ${Date.now()}${i}`
                },
            }))
            const response = await api.bulkCreateCustomObjects(
                testObjType,
                {inputs: objectsToCreate}
            );
            expect(response.results).toHaveProperty('length');
            expect(response.results.length).toBe(batchSize);
            createdBatch = response.results;

            const companyResponse = await api.listCompanies();
            toCompany = companyResponse.results[0].id;
        })

        it('Should create batch default associations', async () => {
            const inputs = createdBatch.map(o => {
                return {
                    from: {id: o.id},
                    to: {id: toCompany}
                }
            });
            const response = await api.createBatchAssociationsDefault(
                testObjType,
                'COMPANY',
                inputs
            );
            expect(response).toBeDefined();
            expect(response).toHaveProperty('length');
            expect(response.length).toBe(createdBatch.length * 2);
        })

        let createdLabel;
        it('Should create a test association label', async () => {
            const response = await api.createAssociationLabel(testObjType, 'COMPANY', {
                inverseLabel: 'ooF',
                name: 'Foo',
                label: 'Foo',
            });
            expect(response).toBeDefined();
            const {results} = response;
            expect(results).toHaveProperty('length');
            expect(results.length).toBe(2);
            expect(results.find(label => label.label && label.label === 'Foo')).toBeTruthy();
            createdLabel = results.find(label => label.label && label.label === 'Foo');
        })

        it('Should get association labels', async () => {
            const labels = await api.getAssociationLabels(testObjType, 'COMPANY');
            expect(labels).toBeDefined();
            expect(labels.results).toHaveProperty('length');
            expect(labels.results.find(label => label.label && label.label === 'Foo')).toBeTruthy();
            const created = labels.results.find(label => label.label && label.label === 'Foo');
            expect(created).toEqual(createdLabel);
        })

        it('Should associate a batch of objects', async () => {
            const inputs = createdBatch.map(o => {
                return {
                    types: [{
                        associationCategory: createdLabel.category,
                        associationTypeId: createdLabel.typeId
                    }],
                    from: {id: o.id},
                    to: {id: toCompany}
                }
            });
            const response = await api.createBatchAssociations(
                testObjType,
                'COMPANY',
                inputs
            );
            expect(response).toBeDefined();
            expect(response).toHaveProperty('length');
            expect(response.length).toBe(createdBatch.length);
        });

        it('Should read the associations of a batch of objects', async () => {
            const inputs = createdBatch.map(o => ({id: o.id}));
            const response = await api.getBatchAssociations(
                testObjType,
                'COMPANY',
                inputs
            )
            expect(response).toBeDefined();
            expect(response).toHaveProperty('length');
            expect(response.length).toBe(createdBatch.length);
            for (const a of response) {
                expect(a).toHaveProperty('to');
                expect(a.to[0].associationTypes).toHaveProperty('length');
                expect(a.to[0].associationTypes.some(t => t.typeId === createdLabel.typeId)).toBe(true);
            }
        })

        it('Should remove the specific labelled associations of a batch of objects', async () => {
            const inputs = createdBatch.map(o => {
                return {
                    types: [{
                        associationCategory: createdLabel.category,
                        associationTypeId: createdLabel.typeId
                    }],
                    from: {id: o.id},
                    to: {id: toCompany}
                }
            });
            const response = await api.deleteBatchAssociationLabels(
                testObjType,
                'COMPANY',
                inputs
            );
            expect(response).toBeDefined();
            expect(response.status).toBe(204);
        })

        it('Should delete an association label', async () => {
            const response = await api.deleteAssociationLabel(testObjType, 'COMPANY', createdLabel.typeId);
            expect(response).toBeDefined();
            expect(response.status).toBe(204);
        })

        afterAll(async () => {
            const inputs = createdBatch.map(o => {
                return {id: o.id}
            });
            const response = await api.bulkArchiveCustomObjects(
                testObjType,
                {
                    inputs
                }
            );
            expect(response).toBeDefined();
            expect(response).toBe("");
        });
    });

    describe('Properties requests', () => {
        let groupeName;
        it('Should retrieve a property', async () => {
            const response = await api.getPropertyByName('tests', 'word');
            expect(response).toBeDefined();
            expect(response).toHaveProperty('label');
            expect(response.label).toBe('Word');
            groupeName = response.groupName;
        });

        it('Should create a property', async () => {
            const response = await api.createProperty('tests', {
                "name": "test_field",
                "label": "Test Field",
                "type": "enumeration",
                "fieldType": "select",
                "groupName": groupeName,
                "description": "A test of enumerated fields",
                "options": [
                    {
                        "label": "Item One",
                        "value": "item_one"
                    },
                    {
                        "label": "Item Two",
                        "value": "item_two"
                    }
                ]
            });
            expect(response).toBeDefined();
            expect(response).toHaveProperty('label');
            expect(response.name).toBe('test_field');
        });

        it('Should update a property', async () => {
            const existing = await api.getPropertyByName('tests', 'test_field');
            existing.options.push(
                {
                    "label": "Item Three",
                    "value": "item_three",
                }
            )
            const response = await api.updateProperty('tests', 'test_field', existing);
            expect(response).toBeDefined();
            expect(response).toHaveProperty('options');
            expect(response.options.some(o => o.label === 'Item Three')).toBeTruthy();
        });

        it('Should delete a property', async () => {
            const response = await api.deleteProperty('tests', 'test_field');
            expect(response).toBeDefined();
            expect(response.status).toBe(204);
        })

    })
});
