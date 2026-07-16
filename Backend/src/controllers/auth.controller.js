const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                message: 'Email y contraseña son obligatorios'
            });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash =
            process.env.ADMIN_PASSWORD_HASH;

        if (!adminEmail || !adminPasswordHash) {
            throw new Error(
                'Las credenciales administrativas no están configuradas'
            );
        }

        const validEmail =
            email.trim().toLowerCase() ===
            adminEmail.trim().toLowerCase();

        const validPassword = await bcrypt.compare(
            password,
            adminPasswordHash
        );

        if (!validEmail || !validPassword) {
            return res.status(401).json({
                ok: false,
                message: 'Credenciales incorrectas'
            });
        }

        const token = jwt.sign(
            {
                sub: adminEmail,
                role: 'admin',
                tenant: 'floristeria-magno'
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: '2h',
                issuer: 'listoenlinea-api',
                audience: 'listoenlinea-admin'
            }
        );

        return res.status(200).json({
            ok: true,
            token,
            tokenType: 'Bearer',
            expiresIn: 7200
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    login
};