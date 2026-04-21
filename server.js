// server.js - Ajustado para roles (admin / encargado) y validación por laboratorio
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const connection = require("./db");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const nodemailer = require("nodemailer");
const app = express();
const PORT = 3000;

// Configurar multer para subir imágenes ANTES de los middlewares JSON
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({ storage });

// MIDDLEWARES - EL ORDEN IMPORTA
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = "esto-es-una-contraseña-segura";

// =============================
// LOGIN
// =============================
app.post("/api/login", (req, res) => {
  const { correo, password } = req.body;
  console.log("Login:", correo);

  if (!correo || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const query = `
    SELECT 
      u.id_usuario,
      u.nombre,
      u.appaterno,
      u.apmaterno,
      u.rol,
      u.correo,
      u.password,
      u.id_laboratorio,
      l.nombre_lab
    FROM usuario AS u
    LEFT JOIN laboratorio AS l ON u.id_laboratorio = l.id_laboratorio
    WHERE u.correo = ?
  `;

  connection.query(query, [correo], (err, rows) => {
    if (err) {
      console.error("Error BD:", err);
      return res.status(500).json({ error: "Error en BD" });
    }

    if (rows.length === 0 || password !== rows[0].password) {
      return res.status(401).json({ error: "Credenciales invalidas" });
    }

    const u = rows[0];

    const token = jwt.sign(
      {
        id: u.id_usuario,
        correo: u.correo,
        rol: (u.rol || "").trim().toLowerCase(),
      },
      JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.json({
      token,
      correo: u.correo,
      rol: u.rol,
      nombre: u.nombre,
      appaterno: u.appaterno,
      apmaterno: u.apmaterno,
      id_laboratorio: u.id_laboratorio || null,
      nombre_lab: u.nombre_lab || null,
    });
  });
});

// =============================
// AUTH MIDDLEWARES
// =============================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Aseguramos que rol esté en minúsculas y exista id
    req.user = {
      id: decoded.id,
      correo: decoded.correo,
      rol: (decoded.rol || "").trim().toLowerCase(),
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    return res.status(401).json({ error: "Token invalido" });
  }
}

function requireRole(...roles) {
  const normalized = roles.map((r) => r.trim().toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado" });
    const userRole = (req.user.rol || "").trim().toLowerCase();
    if (!normalized.includes(userRole))
      return res.status(403).json({ error: "No autorizado" });
    next();
  };
}

// =============================
// USUARIOS Y ENCARGADOS
// =============================
app.get("/api/usuarios", auth, (req, res) => {
    // Traemos los datos del usuario y el nombre de su lab asignado
    const sql = `
        SELECT 
            u.id_usuario, u.nombre, u.appaterno, u.apmaterno, u.rol, u.correo, u.password, u.id_laboratorio,
            l.nombre_lab
        FROM usuario u
        LEFT JOIN laboratorio l ON u.id_laboratorio = l.id_laboratorio
        ORDER BY u.nombre ASC
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            console.error("❌ ERROR SQL USUARIOS:", err);
            return res.status(500).json({ error: "Error al obtener usuarios" });
        }
        res.json(results);
    });
});

app.post("/api/usuarios", auth, requireRole("admin"), (req, res) => {
  const { nombre, appaterno, apmaterno, correo, rol, password } = req.body;
  if (!nombre || !appaterno || !correo || !rol || !password) {
    return res.status(400).json({ error: "Campos obligatorios faltantes" });
  }
  const query =
    "INSERT INTO usuario (nombre, appaterno, apmaterno, correo, rol, password) VALUES (?, ?, ?, ?, ?, ?)";
  connection.query(
    query,
    [nombre, appaterno, apmaterno, correo, rol, password],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error al crear usuario" });
      res.status(201).json({ mensaje: "Usuario creado", id: result.insertId });
    },
  );
});

app.put("/api/usuarios/:id", auth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const { nombre, appaterno, apmaterno, correo, rol, password, id_laboratorio } = req.body; // ✨ Recibimos id_laboratorio

  // Agregamos id_laboratorio a la consulta SQL
  const query = `
    UPDATE usuario 
    SET nombre = ?, appaterno = ?, apmaterno = ?, correo = ?, rol = ?, password = ?, id_laboratorio = ? 
    WHERE id_usuario = ?
  `;

  connection.query(
    query,
    [nombre, appaterno, apmaterno, correo, rol, password, id_laboratorio, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error al editar usuario" });
      res.json({ mensaje: "Usuario actualizado correctamente" });
    }
  );
});

app.delete("/api/usuarios/:id", auth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM usuario WHERE id_usuario = ?";
  connection.query(query, [id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error al eliminar usuario" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ mensaje: "Usuario eliminado" });
  });
});

app.get("/api/encargados", auth, requireRole("admin"), (req, res) => {
  const query = `
    SELECT u.id_usuario, e.id_encargado, u.nombre, u.appaterno, u.correo
    FROM encargado AS e
    JOIN usuario AS u ON e.id_usuario = u.id_usuario
    ORDER BY u.nombre ASC
  `;
  connection.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error al obtener encargados" });
    res.json(results);
  });
});

// =============================
//// =============================
// LABORATORIOS
// =============================
app.get("/api/laboratorios", auth, (req, res) => {
    const { rol, id: userId } = req.user;

    // Esta query trae TODO: id, nombre, edificio, planta e id_encargado
    let query = `
        SELECT id_laboratorio, nombre_lab, edificio, planta, id_encargado 
        FROM laboratorio
    `;
    let params = [];

    // Si es PROFESOR, ve solo el laboratorio asignado en usuario.id_laboratorio
    if (rol === "profesor") {
        query = `
            SELECT l.id_laboratorio, l.nombre_lab, l.edificio, l.planta, l.id_encargado 
            FROM laboratorio l
            JOIN usuario u ON l.id_laboratorio = u.id_laboratorio
            WHERE u.id_usuario = ?
        `;
        params.push(userId);
    } 
    // Si es ENCARGADO, ve los laboratorios que maneja
    else if (rol === "encargado") {
        query = `
            SELECT l.id_laboratorio, l.nombre_lab, l.edificio, l.planta, l.id_encargado 
            FROM laboratorio l
            WHERE l.id_encargado = (SELECT id_encargado FROM encargado WHERE id_usuario = ?)
        `;
        params.push(userId);
    }

    connection.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post("/api/laboratorios", auth, requireRole("admin"), (req, res) => {
  const { nombre, edificio, planta, id_encargado } = req.body;
  if (!nombre || !edificio || !planta || !id_encargado) {
    return res.status(400).json({ error: "Campos obligatorios faltantes" });
  }
  connection.query(
    "INSERT INTO laboratorio (nombre_lab, edificio, planta, id_encargado) VALUES (?, ?, ?, ?)",
    [nombre, edificio, planta, id_encargado],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error al crear laboratorio" });
      res
        .status(201)
        .json({ mensaje: "Laboratorio creado", id: result.insertId });
    },
  );
});

app.put("/api/laboratorios/:id", auth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const { nombre, edificio, planta, id_encargado } = req.body;
  if (!nombre || !edificio || !planta || !id_encargado)
    return res.status(400).json({ error: "Campos obligatorios faltantes" });
  connection.query(
    "UPDATE laboratorio SET nombre_lab = ?, edificio = ?, planta = ?, id_encargado = ? WHERE id_laboratorio = ?",
    [nombre, edificio, planta, id_encargado, id],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Error al actualizar laboratorio" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Laboratorio no encontrado" });
      res.json({ mensaje: "Laboratorio actualizado" });
    },
  );
});

app.delete("/api/laboratorios/:id", auth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  connection.query(
    "DELETE FROM laboratorio WHERE id_laboratorio = ?",
    [id],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error al eliminar laboratorio" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Laboratorio no encontrado" });
      res.json({ mensaje: "Laboratorio eliminado" });
    },
  );
});

// =============================
// CONSUMIBLES (GET / POST / PUT / DELETE)
// =============================
app.get("/api/consumibles", auth, (req, res) => {
  const userId = req.user.id;
  const rol = req.user.rol;
  if (rol === "admin") {
    // Usamos c.* para traer todo lo de consumibles y l.nombre_lab para la ubicación
    const query = `
        SELECT 
            c.*, 
            l.nombre_lab, 
            l.edificio
        FROM consumibles c
        JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
        ORDER BY l.edificio ASC, l.nombre_lab ASC
    `;

    connection.query(query, (err, results) => {
      if (err) {
        console.error("ERROR SQL:", err); // Esto imprimirá el error real en tu terminal
        return res.status(500).json({ error: "Error al obtener consumibles" });
      }
      res.json(results);
    });
  } else if (rol === "encargado") {
    const query = `
      SELECT c.id, c.nombre_con, c.stock, l.id_laboratorio, l.nombre_lab, l.edificio
      FROM consumibles c
      JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
      JOIN encargado e ON l.id_encargado = e.id_encargado
      WHERE e.id_usuario = ?
      ORDER BY c.nombre_con ASC
    `;
    connection.query(query, [userId], (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener consumibles" });
      res.json(results);
    });
  } else {
    return res.status(403).json({ error: "No autorizado" });
  }
});

// Crear consumible (admin o encargado, encargado solo en su laboratorio)
app.post(
  "/api/consumibles",
  auth,
  requireRole("admin", "encargado"),
  (req, res) => {
    const { nombre, stock, id_laboratorio } = req.body;
    const { rol, id: userId } = req.user;

    if (!nombre || stock === undefined || !id_laboratorio) {
      return res.status(400).json({ error: "Campos obligatorios faltantes" });
    }

    // =========================
    // SI ES ENCARGADO
    // =========================
    if (rol === "encargado") {
      const q = `
        SELECT l.id_laboratorio
        FROM laboratorio l
        JOIN encargado e ON l.id_encargado = e.id_encargado
        WHERE e.id_usuario = ?
      `;

      connection.query(q, [userId], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: "Error validando laboratorio" });
        }

        if (
          rows.length === 0 ||
          rows[0].id_laboratorio !== parseInt(id_laboratorio)
        ) {
          return res.status(403).json({
            error: "No puedes crear consumibles en otro laboratorio",
          });
        }

        // 🔥 AQUÍ USAMOS EL PROCEDURE (TRANSACCIÓN)
        connection.query(
          "CALL insertar_consumible(?, ?, ?)",
          [nombre, stock, id_laboratorio],
          (err, result) => {
            if (err) {
              return res.status(400).json({
                error: err.sqlMessage || "Error al crear consumible",
              });
            }

            res.status(201).json({
              mensaje: "Consumible creado correctamente",
            });
          }
        );
      });
    }

    // =========================
    // SI ES ADMIN
    // =========================
    else {
      connection.query(
        "CALL insertar_consumible(?, ?, ?)",
        [nombre, stock, id_laboratorio],
        (err, result) => {
          if (err) {
            return res.status(400).json({
              error: err.sqlMessage || "Error al crear consumible",
            });
          }

          res.status(201).json({
            mensaje: "Consumible creado correctamente",
          });
        }
      );
    }
  }
);

// Editar consumible (admin o encargado, encargado solo su laboratorio)
app.put(
  "/api/consumibles/:id",
  auth,
  requireRole("admin", "encargado"),
  (req, res) => {
    const { id } = req.params;
    const { nombre, stock } = req.body;
    const { rol, id: userId } = req.user;

    if (!nombre || stock === undefined)
      return res.status(400).json({ error: "Campos obligatorios faltantes" });

    if (rol === "encargado") {
      const q = `
        SELECT c.id
        FROM consumibles c
        JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
        JOIN encargado e ON l.id_encargado = e.id_encargado
        WHERE c.id = ? AND e.id_usuario = ?
      `;

      connection.query(q, [id, userId], (err, rows) => {
        if (err)
          return res.status(500).json({ error: "Error validando consumible" });

        if (rows.length === 0)
          return res.status(403).json({
            error: "No puedes editar consumibles de otro laboratorio",
          });

        const query =
          "UPDATE consumibles SET nombre_con = ?, stock = ? WHERE id = ?";

        connection.query(query, [nombre, stock, id], (err, result) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Error al editar consumible" });

          if (result.affectedRows === 0)
            return res
              .status(404)
              .json({ error: "Consumible no encontrado" });

          res.json({ mensaje: "Consumible actualizado" });
        });
      });
    } else {
      const query =
        "UPDATE consumibles SET nombre_con = ?, stock = ? WHERE id = ?";

      connection.query(query, [nombre, stock, id], (err, result) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Error al editar consumible" });

        if (result.affectedRows === 0)
          return res
            .status(404)
            .json({ error: "Consumible no encontrado" });

        res.json({ mensaje: "Consumible actualizado" });
      });
    }
  }
);

// Eliminar consumible (admin o encargado, encargado solo su laboratorio)
app.delete(
  "/api/consumibles/:id",
  auth,
  requireRole("admin", "encargado"),
  (req, res) => {
    const { id } = req.params;
    const { rol, id: userId } = req.user;

    if (rol === "encargado") {
      const q = `
        SELECT c.id
        FROM consumibles c
        JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
        JOIN encargado e ON l.id_encargado = e.id_encargado
        WHERE c.id = ? AND e.id_usuario = ?
      `;

      connection.query(q, [id, userId], (err, rows) => {
        if (err)
          return res.status(500).json({ error: "Error validando consumible" });

        if (rows.length === 0)
          return res.status(403).json({
            error: "No puedes eliminar consumibles de otro laboratorio",
          });

        const query = "DELETE FROM consumibles WHERE id = ?";

        connection.query(query, [id], (err, result) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Error al eliminar consumible" });

          if (result.affectedRows === 0)
            return res
              .status(404)
              .json({ error: "Consumible no encontrado" });

          res.json({ mensaje: "Consumible eliminado" });
        });
      });
    } else {
      const query = "DELETE FROM consumibles WHERE id = ?";

      connection.query(query, [id], (err, result) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Error al eliminar consumible" });

        if (result.affectedRows === 0)
          return res
            .status(404)
            .json({ error: "Consumible no encontrado" });

        res.json({ mensaje: "Consumible eliminado" });
      });
    }
  }
);

// =============================
// EQUIPOS (GET / POST / PUT / DELETE)
// =============================
app.get("/api/equipos", auth, (req, res) => {
  const userId = req.user.id;
  const rol = req.user.rol;
  if (rol === "admin") {
    const query = `
      SELECT e.id_equipo, e.nombre, e.no_serie, e.numero, e.tipo, l.nombre_lab, l.edificio, e.id_laboratorio
      FROM equipo e
      JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
      ORDER BY e.nombre ASC
    `;
    connection.query(query, (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener equipos" });
      res.json(rows);
    });
  } else if (rol === "encargado") {
    const query = `
      SELECT e.id_equipo, e.nombre, e.no_serie, e.numero, e.tipo, l.nombre_lab, l.edificio, e.id_laboratorio
      FROM equipo e
      JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
      JOIN encargado en ON l.id_encargado = en.id_encargado
      WHERE en.id_usuario = ?
      ORDER BY e.nombre ASC
    `;
    connection.query(query, [userId], (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener equipos" });
      res.json(rows);
    });
  } else if (rol === "profesor") {
    const query = `
      SELECT e.id_equipo, e.nombre, e.no_serie, e.numero, e.tipo, l.nombre_lab, l.edificio, e.id_laboratorio
      FROM equipo e
      JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
      WHERE e.id_laboratorio = (
        SELECT id_laboratorio FROM usuario WHERE id_usuario = ?
      )
      ORDER BY e.nombre ASC
    `;
    connection.query(query, [userId], (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener equipos" });
      res.json(rows);
    });
  } else {
    return res.status(403).json({ error: "No autorizado" });
  }
});

// Crear equipo
app.post(
  "/api/equipos",
  auth,
  requireRole("admin", "encargado"),
  (req, res) => {
    const { nombre, no_serie, numero, id_laboratorio, tipo } = req.body;
    const { rol, id: userId } = req.user;

    if (!nombre || !no_serie || !numero || !id_laboratorio || !tipo) {
      return res.status(400).json({ error: "Campos obligatorios faltantes" });
    }

    if (rol === "encargado") {
      const q = `
        SELECT l.id_laboratorio
        FROM laboratorio l
        JOIN encargado e ON l.id_encargado = e.id_encargado
        WHERE e.id_usuario = ?
      `;

      connection.query(q, [userId], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: "Error validando laboratorio" });
        }

        if (
          rows.length === 0 ||
          rows[0].id_laboratorio !== parseInt(id_laboratorio)
        ) {
          return res
            .status(403)
            .json({ error: "No puedes crear equipos en otro laboratorio" });
        }

        const query = `
          INSERT INTO equipo (nombre, no_serie, numero, id_laboratorio, tipo)
          VALUES (?, ?, ?, ?, ?)
        `;

        connection.query(
          query,
          [nombre, no_serie, numero, id_laboratorio, tipo],
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: "Error al crear equipo" });
            }

            res.status(201).json({
              message: "Equipo creado correctamente",
              id: result.insertId,
            });
          }
        );
      });
    } else {
      const query = `
        INSERT INTO equipo (nombre, no_serie, numero, id_laboratorio, tipo)
        VALUES (?, ?, ?, ?, ?)
      `;

      connection.query(
        query,
        [nombre, no_serie, numero, id_laboratorio, tipo],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: "Error al crear equipo" });
          }

          res.status(201).json({
            message: "Equipo creado correctamente",
            id: result.insertId,
          });
        }
      );
    }
  }
);

// Editar equipo
app.put(
  "/api/equipos/:id",
  auth,
  requireRole("admin", "encargado"),
  (req, res) => {
    const { id } = req.params;
    const { nombre, no_serie, numero, id_laboratorio, tipo } = req.body;
    const { rol, id: userId } = req.user;

    if (!nombre || !no_serie || !numero || !id_laboratorio || !tipo) {
      return res.status(400).json({ error: "Campos obligatorios faltantes" });
    }

    if (rol === "encargado") {
      const q = `
        SELECT e.id_equipo
        FROM equipo e
        JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
        JOIN encargado en ON l.id_encargado = en.id_encargado
        WHERE e.id_equipo = ? AND en.id_usuario = ?
      `;

      connection.query(q, [id, userId], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: "Error validando equipo" });
        }

        if (rows.length === 0) {
          return res
            .status(403)
            .json({ error: "No puedes editar equipos de otro laboratorio" });
        }

        const query = `
          UPDATE equipo 
          SET nombre=?, no_serie=?, numero=?, id_laboratorio=?, tipo=? 
          WHERE id_equipo=?
        `;

        connection.query(
          query,
          [nombre, no_serie, numero, id_laboratorio, tipo, id],
          (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ error: "Error al actualizar equipo" });
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({ error: "Equipo no encontrado" });
            }

            res.json({ message: "Equipo actualizado correctamente" });
          }
        );
      });
    } else {
      const query = `
        UPDATE equipo 
        SET nombre=?, no_serie=?, numero=?, id_laboratorio=?, tipo=? 
        WHERE id_equipo=?
      `;

      connection.query(
        query,
        [nombre, no_serie, numero, id_laboratorio, tipo, id],
        (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Error al actualizar equipo" });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Equipo no encontrado" });
          }

          res.json({ message: "Equipo actualizado correctamente" });
        }
      );
    }
  }
);

// Eliminar equipo
app.delete(
  "/api/equipos/:id",
  auth,
  requireRole("admin", "encargado"),
  (req, res) => {
    const { id } = req.params;
    const { rol, id: userId } = req.user;

    if (rol === "encargado") {
      const q = `
        SELECT e.id_equipo
        FROM equipo e
        JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
        JOIN encargado en ON l.id_encargado = en.id_encargado
        WHERE e.id_equipo = ? AND en.id_usuario = ?
      `;

      connection.query(q, [id, userId], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: "Error validando equipo" });
        }

        if (rows.length === 0) {
          return res
            .status(403)
            .json({ error: "No puedes eliminar equipos de otro laboratorio" });
        }

        const query = "DELETE FROM equipo WHERE id_equipo = ?";

        connection.query(query, [id], (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Error al eliminar equipo" });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Equipo no encontrado" });
          }

          res.json({ message: "Equipo eliminado correctamente" });
        });
      });
    } else {
      const query = "DELETE FROM equipo WHERE id_equipo = ?";

      connection.query(query, [id], (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Error al eliminar equipo" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Equipo no encontrado" });
        }

        res.json({ message: "Equipo eliminado correctamente" });
      });
    }
  }
);

// =============================
// DASHBOARD / STATS / INCIDENCIAS
// =============================
app.get("/api/dashboard/stats", auth, (req, res) => {
  const { rol, id: userId } = req.user;

  // Si es ADMIN: Query global
  if (rol === "admin") {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM equipo WHERE tipo = 'PC') as totalPCs,
        (SELECT COUNT(*) FROM equipo WHERE tipo = 'Monitor') as totalMonitores,
        (SELECT SUM(stock) FROM consumibles) as stockTotalConsumibles
    `;
    connection.query(query, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0]);
    });
  }
  // Si es ENCARGADO: Filtramos por el laboratorio que tiene asignado
  else if (rol === "encargado") {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM equipo e 
         JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio 
         JOIN encargado enc ON l.id_encargado = enc.id_encargado 
         WHERE e.tipo = 'PC' AND enc.id_usuario = ?) as totalPCs,
        (SELECT COUNT(*) FROM equipo e 
         JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio 
         JOIN encargado enc ON l.id_encargado = enc.id_encargado 
         WHERE e.tipo = 'Monitor' AND enc.id_usuario = ?) as totalMonitores,
        (SELECT SUM(c.stock) FROM consumibles c 
         JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio 
         JOIN encargado enc ON l.id_encargado = enc.id_encargado 
         WHERE enc.id_usuario = ?) as stockTotalConsumibles
    `;
    // Pasamos el userId 3 veces (una para cada subconsulta)
    connection.query(query, [userId, userId, userId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0]);
    });
  } else {
    res.status(403).json({ error: "No autorizado" });
  }
});

app.get("/api/dashboard/incidencias-recientes", auth, (req, res) => {
  const { rol, id: userId } = req.user;

  let query = `
    SELECT 
      e.nombre AS nombre_equipo,
      e.no_serie,
      u.nombre AS nombre_usuario,
      e.tipo AS tipo_equipo,
      i.estado
    FROM incidencia i
    JOIN equipo e ON i.id_equipo = e.id_equipo
    JOIN usuario u ON i.id_usuario = u.id_usuario
    JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
  `;

  const params = [];
  if (rol === "encargado") {
    query += ` JOIN encargado enc ON l.id_encargado = enc.id_encargado WHERE enc.id_usuario = ?`;
    params.push(userId);
  }

  query += ` ORDER BY i.fecha DESC, i.hora DESC LIMIT 5`;

  connection.query(query, params, (err, rows) => {
    if (err)
      return res.status(500).json({ error: "Error al obtener incidencias" });
    res.json(rows);
  });
});

// =============================
// RUTAS ESTÁTICAS / RAÍZ
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

// =============================
// INICIAR SERVIDOR
// =============================
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
// ==========================================
// RUTAS PARA INCIDENCIAS (INLAB)
// ==========================================

// 1. CREAR NUEVA INCIDENCIA (POST)
app.post("/api/incidencias", auth, upload.single('imagen'), async (req, res) => {
  const id_usuario = req.user.id;
  const { id_equipo, fecha, hora, descripcion, estado } = req.body;

  if (!id_equipo || !fecha || !hora || !descripcion) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const nombreFoto = req.file ? req.file.filename : null;

  const insertQuery = `
        INSERT INTO incidencia (id_equipo, id_usuario, fecha, hora, descripcion, estado, foto)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

  connection.query(
    insertQuery,
    [id_equipo, id_usuario, fecha, hora, descripcion, estado || 'pendiente', nombreFoto],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al crear incidencia' });
      }

      const queryEncargado = `
            SELECT u.correo, l.nombre_lab
            FROM equipo eq
            JOIN laboratorio l ON eq.id_laboratorio = l.id_laboratorio
            JOIN encargado en ON l.id_encargado = en.id_encargado
            JOIN usuario u ON en.id_usuario = u.id_usuario
            WHERE eq.id_equipo = ?
        `;

      connection.query(queryEncargado, [id_equipo], async (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(201).json({ message: 'Incidencia creada pero sin notificación' });
        }

        if (rows.length === 0) {
          return res.status(201).json({ message: 'Incidencia creada (sin encargado asignado)' });
        }

        const { correo, nombre_lab } = rows[0];

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'pushupvenom@gmail.com',
            pass: 'aejaonuecmehyhyd'
          }
        });

        const mailOptions = {
          from: 'pushupvenom@gmail.com',
          to: correo,
          subject: 'Nueva incidencia en laboratorio',
          text: `
Se ha registrado una nueva incidencia.

Laboratorio: ${nombre_lab}
Descripción: ${descripcion}
Fecha: ${fecha} ${hora}
                `
        };

        try {
          await transporter.sendMail(mailOptions);
          res.status(201).json({ message: 'Incidencia creada y notificada correctamente' });
        } catch (error) {
          console.error(error);
          res.status(201).json({ message: 'Incidencia creada pero error al enviar correo' });
        }
      });
    },
  );
});

// ==========================================
// 2. OBTENER INCIDENCIAS ACTUALES (GET) - ¡Agregamos 'auth'!
// ==========================================
app.get("/api/incidencias/actuales", auth, (req, res) => {
    const { rol, id: userId } = req.user;
    
    let query = `
        SELECT i.*, e.nombre AS nombre_equipo, u.nombre AS nombre_usuario, l.nombre_lab, e.id_laboratorio
        FROM incidencia i
        JOIN equipo e ON i.id_equipo = e.id_equipo
        JOIN usuario u ON i.id_usuario = u.id_usuario
        JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
        WHERE i.estado = 'pendiente'
    `;
    let params = [];

    // Si es profesor, filtra por su laboratorio asignado en usuario
    if (rol === "profesor") {
        query += " AND e.id_laboratorio = (SELECT id_laboratorio FROM usuario WHERE id_usuario = ?)";
        params.push(userId);
    }
    // Si es encargado, filtra por los laboratorios que maneja
    else if (rol === "encargado") {
        query += `
            AND e.id_laboratorio IN (
                SELECT l2.id_laboratorio 
                FROM laboratorio l2 
                WHERE l2.id_encargado = (SELECT id_encargado FROM encargado WHERE id_usuario = ?)
            )
        `;
        params.push(userId);
    }

    connection.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// 3. RESOLVER INCIDENCIA (PUT) - ¡Agregamos 'auth'!
// ==========================================
app.put("/api/incidencias/:id/resolver", auth, (req, res) => {
  const id_incidencia = req.params.id;
  const { estado, solucion } = req.body;
  const id_usuario_solucion = req.user.id;

  // Nombre de tabla en singular
  const query = `
        UPDATE incidencia 
        SET estado = ?, solucion = ?, fecha_resolucion = NOW(), id_usuario_solucion = ? 
        WHERE id_incidencia = ?
    `;
  connection.query(query, [estado, solucion, id_usuario_solucion, id_incidencia], (err, results) => {
    if (err) {
      console.error("Error al resolver incidencia:", err);
      return res
        .status(500)
        .json({ error: "Error al actualizar la incidencia" });
    }
    res.json({ message: "Incidencia archivada correctamente" });
  });
});

// OBTENER TODAS LAS INCIDENCIAS (Para el historial)
app.get("/api/incidencias", auth, (req, res) => {
  const { rol, id: userId } = req.user;
    
    let query = `
        SELECT 
            i.*, 
            e.nombre AS nombre_equipo, 
            ur.nombre AS nombre_reporte,
            us.nombre AS nombre_solucion,
            e.id_laboratorio 
        FROM incidencia i
        JOIN equipo e ON i.id_equipo = e.id_equipo
        JOIN usuario ur ON COALESCE(i.id_usuario_reporte, i.id_usuario) = ur.id_usuario
        LEFT JOIN usuario us ON i.id_usuario_solucion = us.id_usuario
    `;
    
    const params = [];

    // 🔒 Si es profesor, solo ve incidencias de su laboratorio asignado
    if (rol === "profesor") {
        query += " WHERE e.id_laboratorio = (SELECT id_laboratorio FROM usuario WHERE id_usuario = ?)";
        params.push(userId);
    } 
    // 🔒 Si es encargado, solo ve incidencias de los laboratorios que maneja
    else if (rol === "encargado") {
        query += `
            WHERE e.id_laboratorio IN (
                SELECT l.id_laboratorio 
                FROM laboratorio l 
                WHERE l.id_encargado = (SELECT id_encargado FROM encargado WHERE id_usuario = ?)
            )
        `;
        params.push(userId);
    }

    query += " ORDER BY i.fecha DESC, i.hora DESC";

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error("Error al obtener historial de incidencias:", err);
            return res.status(500).json({ error: "Error al obtener historial" });
        }
        res.json(results);
    });
});
