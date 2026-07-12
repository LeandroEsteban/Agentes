const express = require('express');
const documents = require('./router');
const reviews = require('../document-reviews/router');
const approvals = require('../document-approvals/router');
const signatures = require('../document-signatures/router');

const router = express.Router();
router.use(documents);
router.use(reviews);
router.use(approvals);
router.use(signatures);

module.exports = router;
