"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => {
    if (req.query.barcode)
        return (0, product_controller_1.getProductByBarcode)(req, res);
    return (0, product_controller_1.getProducts)(req, res);
});
router.get('/:id', product_controller_1.getProduct);
router.post('/', product_controller_1.createProduct);
router.post('/full', product_controller_1.createFullProductFlow);
router.put('/:id', product_controller_1.updateProduct);
router.delete('/:id', product_controller_1.deleteProduct);
exports.default = router;
