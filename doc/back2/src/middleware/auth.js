const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
    const token = req.cookies.jwt; // ✅ 쿠키에서 토큰 꺼냄

    if (!token) {
        return res.status(401).json({
            redirectUrl: process.env.LOGIN_URL,
            message: "토큰이 없습니다."
          });
        
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // 이후 라우터에서 req.user 사용 가능
        next();
    } catch (err) {
        return res.status(403).json({ message: "유효하지 않은 토큰입니다." });
    }
};
