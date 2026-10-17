// Middleware de autenticação e autorização

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
}

function isTeacher(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'teacher') {
    return next();
  }
  res.status(403).render('error', {
    title: 'Acesso Negado',
    message: 'Apenas professores podem acessar esta área.',
    user: req.session.userId ? { id: req.session.userId, name: req.session.userName, role: req.session.userRole } : null
  });
}

function isStudent(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'student') {
    return next();
  }
  res.status(403).render('error', {
    title: 'Acesso Negado',
    message: 'Esta área é exclusiva para alunos.',
    user: req.session.userId ? { id: req.session.userId, name: req.session.userName, role: req.session.userRole } : null
  });
}

// Middleware to attach user info to all views
function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    res.locals.user = {
      id: req.session.userId,
      name: req.session.userName,
      role: req.session.userRole,
      email: req.session.userEmail,
      points: req.session.userPoints || 0,
      level: req.session.userLevel || 1
    };
  } else {
    res.locals.user = null;
  }
  res.locals.currentPath = req.path;
  next();
}

module.exports = { isAuthenticated, isTeacher, isStudent, attachUser };
