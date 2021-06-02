var multer = require('multer');

exports.multerconf = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/profilepic');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfforWebdata = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/webdata');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfforInvoiceImages = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/invoiceimage');
        },
        filename: function (req, file, next) {
            next(null, file.originalname);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
    }
}


exports.multerconfForChekIn = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/checkin');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfForRestaurant = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/restaurantpic');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
        // const image = file.mimetype.startWith('image/');
        // if (image)
        //   next(null, true);
        // else
        //   next({ message: "file type is not supported" }, false);
    }
}

exports.multerconfForCatimg = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/catimg');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
        // const image = file.mimetype.startWith('image/');
        // if (image)
        //   next(null, true);
        // else
        //   next({ message: "file type is not supported" }, false);
    }
}

exports.multerconfForMenuItems = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/menuitems');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfForAdvert = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/advertimage');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfForPromoVideo = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/promovideo');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {

        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfForgallery = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/gallery');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {


        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfFordriver = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/driver');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {


        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfForResReg = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/resreg');
        },
        filename: function (req, file, next) {
            const ext = file.mimetype.split('/')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {


        if (!file)
            next();

        next(null, true);
    }
}

exports.multerconfFormenuExcel = {
    storage: multer.diskStorage({
        destination: function (req, file, next) {
            next(null, 'public/menuexcel');
        },
        filename: function (req, file, next) {
            const ext = file.originalname.split('.')[1];
            next(null, file.fieldname + '-' + Date.now() + '.' + ext);
        }
    }),
    fileFilter: function (req, file, next) {
        if (!file)
            next();

        next(null, true);
    }
}

