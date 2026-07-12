const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const { asyncRoute, validate } = require('../../shared/helpers/http');
const controller = require('./controller');
const validators = require('./validators');

const router = express.Router();
router.get('/api/v1/document-types', authenticate, authorize('documents.view'), asyncRoute(controller.listDocumentTypes));
router.post('/api/v1/document-types', authenticate, authorize('admin.access'), validate(validators.documentType), asyncRoute(controller.createDocumentType));
router.get('/api/v1/admin/procedure-types', authenticate, authorize('tramites.edit'), asyncRoute(controller.listProcedureTypes));
router.post('/api/v1/admin/procedure-types', authenticate, authorize('tramites.edit'), validate(validators.procedureType), asyncRoute(controller.createProcedureType));
router.put('/api/v1/admin/procedure-types/:id', authenticate, authorize('tramites.edit'), validate(validators.params, 'params'), validate(validators.procedureType), asyncRoute(controller.updateProcedureType));
router.get('/api/v1/public/tramites', validate(validators.publicList, 'query'), asyncRoute(controller.listPublished));
router.get('/api/v1/public/tramites/:id', validate(validators.params, 'params'), asyncRoute(controller.getPublished));

module.exports = router;
