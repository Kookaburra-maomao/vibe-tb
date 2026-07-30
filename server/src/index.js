require('dotenv').config();
const Koa = require('koa');
const Router = require('koa-router');
const session = require('koa-session');
const serve = require('koa-static');
const { koaBody } = require('koa-body');
const path = require('path');
const pool = require('./config/db');

const app = new Koa();
const router = new Router({ prefix: '/api' });

// Session 配置
app.keys = ['vibe-tb-secret-key-2026'];
app.use(session({
  key: 'vibetb:sess',
  maxAge: 86400000, // 24h
  httpOnly: true,
  signed: true,
}, app));
app.use(koaBody());

// 登录中间件
async function requireAuth(ctx, next) {
  if (!ctx.session.user) { ctx.status = 401; ctx.body = { error: '请先登录' }; return; }
  await next();
}

// ============================================================
// 认证
// ============================================================
router.post('/auth/login', async (ctx) => {
  const { employee_id, name } = ctx.request.body;
  if (!employee_id || !name) { ctx.status = 400; ctx.body = { error: '请输入工号和姓名' }; return; }
  let [rows] = await pool.query('SELECT * FROM vibetb_users WHERE employee_id = ?', [employee_id]);
  if (rows.length === 0) {
    const [r] = await pool.query('INSERT INTO vibetb_users (employee_id, name) VALUES (?, ?)', [employee_id, name]);
    [rows] = await pool.query('SELECT * FROM vibetb_users WHERE id = ?', [r.insertId]);
  }
  const user = { id: rows[0].id, employee_id: rows[0].employee_id, name: rows[0].name, phone: rows[0].phone };
  ctx.session.user = user;
  ctx.body = { data: user, message: '登录成功' };
});

router.get('/auth/me', requireAuth, async (ctx) => {
  const [rows] = await pool.query('SELECT * FROM vibetb_users WHERE id = ?', [ctx.session.user.id]);
  if (rows.length === 0) { ctx.session = null; ctx.status = 401; ctx.body = { error: '用户不存在' }; return; }
  ctx.session.user = { ...ctx.session.user, phone: rows[0].phone };
  ctx.body = { data: ctx.session.user };
});

router.post('/auth/update-phone', requireAuth, async (ctx) => {
  const { phone } = ctx.request.body;
  if (!phone) { ctx.status = 400; ctx.body = { error: '请输入手机号' }; return; }
  await pool.query('UPDATE vibetb_users SET phone = ? WHERE id = ?', [phone, ctx.session.user.id]);
  ctx.session.user.phone = phone;
  ctx.body = { data: ctx.session.user, message: '手机号已更新' };
});

router.post('/auth/logout', async (ctx) => {
  ctx.session = null;
  ctx.body = { message: '已退出' };
});

// ============================================================
// 报名
// ============================================================
router.post('/registration', requireAuth, async (ctx) => {
  const { phone } = ctx.request.body;
  const [existing] = await pool.query('SELECT id FROM vibetb_registrations WHERE user_id = ?', [ctx.session.user.id]);
  if (existing.length > 0) {
    await pool.query('UPDATE vibetb_registrations SET phone = ?, note = ? WHERE id = ?',
      [phone || null, ctx.request.body.note || null, existing[0].id]);
    ctx.body = { message: '报名信息已更新' };
    return;
  }
  const [r] = await pool.query('INSERT INTO vibetb_registrations (user_id, phone) VALUES (?, ?)',
    [ctx.session.user.id, phone || null]);
  ctx.body = { data: { id: r.insertId }, message: '报名成功' };
});

router.get('/registration', requireAuth, async (ctx) => {
  const [rows] = await pool.query(
    `SELECT r.*, u.name, u.employee_id FROM vibetb_registrations r JOIN vibetb_users u ON r.user_id = u.id`
  );
  ctx.body = { data: rows };
});

// ============================================================
// 拼车
// ============================================================
router.post('/carpool/driver', requireAuth, async (ctx) => {
  const { total_seats, plate, note } = ctx.request.body;
  if (!total_seats || total_seats < 2) { ctx.status = 400; ctx.body = { error: '座位数至少为2' }; return; }
  await pool.query('DELETE FROM vibetb_passengers WHERE user_id = ?', [ctx.session.user.id]);
  await pool.query(
    'INSERT INTO vibetb_drivers (user_id, total_seats, plate, note) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE total_seats=?, plate=?, note=?',
    [ctx.session.user.id, total_seats, plate || null, note || null, total_seats, plate || null, note || null]
  );
  ctx.body = { message: '车主信息已登记' };
});

router.get('/carpool/drivers', requireAuth, async (ctx) => {
  const [rows] = await pool.query(
    `SELECT d.*, u.name, u.employee_id,
            (SELECT COUNT(*) FROM vibetb_passengers p WHERE p.driver_id = d.id) as passenger_count
     FROM vibetb_drivers d JOIN vibetb_users u ON d.user_id = u.id`
  );
  ctx.body = { data: rows };
});

router.post('/carpool/passenger', requireAuth, async (ctx) => {
  await pool.query('DELETE FROM vibetb_drivers WHERE user_id = ?', [ctx.session.user.id]);
  const { driver_id } = ctx.request.body;
  await pool.query(
    'INSERT INTO vibetb_passengers (user_id, driver_id) VALUES (?,?) ON DUPLICATE KEY UPDATE driver_id=?',
    [ctx.session.user.id, driver_id || null, driver_id || null]
  );
  ctx.body = { message: '乘车登记成功' };
});

router.get('/carpool/passengers', requireAuth, async (ctx) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.name, u.employee_id, d.user_id as driver_user_id, du.name as driver_name
     FROM vibetb_passengers p
     JOIN vibetb_users u ON p.user_id = u.id
     LEFT JOIN vibetb_drivers d ON p.driver_id = d.id
     LEFT JOIN vibetb_users du ON d.user_id = du.id`
  );
  ctx.body = { data: rows };
});

router.get('/carpool/my', requireAuth, async (ctx) => {
  const uid = ctx.session.user.id;
  const [drivers] = await pool.query('SELECT * FROM vibetb_drivers WHERE user_id = ?', [uid]);
  const [passengers] = await pool.query('SELECT * FROM vibetb_passengers WHERE user_id = ?', [uid]);
  ctx.body = { data: { driver: drivers[0] || null, passenger: passengers[0] || null } };
});

router.post('/carpool/cancel-driver', requireAuth, async (ctx) => {
  const uid = ctx.session.user.id;
  await pool.query('DELETE FROM vibetb_drivers WHERE user_id = ?', [uid]);
  ctx.body = { message: '已取消车主身份' };
});

// ============================================================
// 活动打卡
// ============================================================
const ACTIVITIES = ['board_game', 'frisbee', 'paddleboard', 'barbecue'];

router.post('/checkin', requireAuth, async (ctx) => {
  const { activity_type } = ctx.request.body;
  if (!ACTIVITIES.includes(activity_type)) { ctx.status = 400; ctx.body = { error: '无效的活动类型' }; return; }
  try {
    await pool.query('INSERT INTO vibetb_checkins (user_id, activity_type) VALUES (?, ?)',
      [ctx.session.user.id, activity_type]);
    ctx.body = { message: '打卡成功' };
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') { ctx.body = { message: '已打卡过该活动' }; return; }
    throw e;
  }
});

router.get('/checkin', requireAuth, async (ctx) => {
  const [rows] = await pool.query(
    `SELECT c.*, u.name, u.employee_id FROM vibetb_checkins c JOIN vibetb_users u ON c.user_id = u.id`
  );
  const [myCheckins] = await pool.query('SELECT activity_type FROM vibetb_checkins WHERE user_id = ?',
    [ctx.session.user.id]);
  ctx.body = {
    data: rows,
    stats: ACTIVITIES.map(a => ({
      activity_type: a,
      label: { board_game: '桌游', frisbee: '飞盘', paddleboard: '桨板', barbecue: '烧烤' }[a],
      count: rows.filter(r => r.activity_type === a).length,
      checked: myCheckins.some(c => c.activity_type === a),
    })),
  };
});

// ============================================================
// 谁是卧底 — 游戏
// ============================================================
router.post('/game/rooms', requireAuth, async (ctx) => {
  const { total_players = 6, spy_count = 1, category = 'random' } = ctx.request.body;
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  let cat = category;
  if (cat === 'random') {
    const cats = ['动物', '电影', '职业', '食物'];
    cat = cats[Math.floor(Math.random() * cats.length)];
  }

  const [pairs] = await pool.query(
    'SELECT * FROM vibetb_word_bank WHERE category = ? ORDER BY RAND() LIMIT 1', [cat]
  );

  const [r] = await pool.query(
    `INSERT INTO vibetb_game_rooms (room_code, host_id, total_players, spy_count, category, civilian_word, spy_word)
     VALUES (?,?,?,?,?,?,?)`,
    [roomCode, ctx.session.user.id, total_players, spy_count, cat,
     pairs.length > 0 ? pairs[0].civilian_word : '苹果',
     pairs.length > 0 ? pairs[0].spy_word : '梨子']
  );

  const word = Math.random() < (spy_count / total_players)
    ? (pairs[0]?.spy_word || '梨子') : (pairs[0]?.civilian_word || '苹果');
  const role = Math.random() < (spy_count / total_players) ? 'spy' : 'civilian';
  await pool.query(
    'INSERT INTO vibetb_game_players (room_id, user_id, role, word) VALUES (?,?,?,?)',
    [r.insertId, ctx.session.user.id, role, pairs[0]?.civilian_word || '苹果']
  );

  ctx.body = {
    data: {
      id: r.insertId, room_code: roomCode, host_id: ctx.session.user.id,
      total_players, spy_count, category: cat, status: 'waiting',
      your_role: role, your_word: word,
    },
    message: '房间已创建',
  };
});

router.post('/game/rooms/:code/join', requireAuth, async (ctx) => {
  const [rooms] = await pool.query('SELECT * FROM vibetb_game_rooms WHERE room_code = ?', [ctx.params.code]);
  if (rooms.length === 0) { ctx.status = 404; ctx.body = { error: '房间不存在' }; return; }
  const room = rooms[0];
  if (room.status !== 'waiting') { ctx.status = 400; ctx.body = { error: '游戏已开始' }; return; }

  const [existing] = await pool.query(
    'SELECT * FROM vibetb_game_players WHERE room_id = ? AND user_id = ?',
    [room.id, ctx.session.user.id]
  );
  if (existing.length > 0) {
    ctx.body = { data: { room_id: room.id, room_code: room.room_code, role: existing[0].role, word: existing[0].word } };
    return;
  }

  const [players] = await pool.query('SELECT COUNT(*) as cnt FROM vibetb_game_players WHERE room_id = ?', [room.id]);
  if (players[0].cnt >= room.total_players) { ctx.status = 400; ctx.body = { error: '房间已满' }; return; }

  const role = players[0].cnt < room.spy_count ? 'spy' : 'civilian';
  const word = role === 'spy' ? room.spy_word : room.civilian_word;
  await pool.query('INSERT INTO vibetb_game_players (room_id, user_id, role, word) VALUES (?,?,?,?)',
    [room.id, ctx.session.user.id, role, word]);
  ctx.body = { data: { room_id: room.id, room_code: room.room_code, role, word }, message: '加入成功' };
});

router.post('/game/rooms/:code/start', requireAuth, async (ctx) => {
  const [rooms] = await pool.query('SELECT * FROM vibetb_game_rooms WHERE room_code = ?', [ctx.params.code]);
  if (rooms.length === 0) { ctx.status = 404; ctx.body = { error: '房间不存在' }; return; }
  const room = rooms[0];
  if (room.host_id !== ctx.session.user.id) { ctx.status = 403; ctx.body = { error: '只有房主可以开始' }; return; }

  const [players] = await pool.query('SELECT COUNT(*) as cnt FROM vibetb_game_players WHERE room_id = ?', [room.id]);
  if (players[0].cnt < 4) { ctx.status = 400; ctx.body = { error: '至少需要4名玩家' }; return; }

  // 重新随机分配角色和词语（确保卧底数量正确）
  const [allPlayers] = await pool.query('SELECT id FROM vibetb_game_players WHERE room_id = ? ORDER BY RAND()', [room.id]);
  for (let i = 0; i < allPlayers.length; i++) {
    const role = i < room.spy_count ? 'spy' : 'civilian';
    const word = role === 'spy' ? room.spy_word : room.civilian_word;
    await pool.query('UPDATE vibetb_game_players SET role = ?, word = ? WHERE id = ?', [role, word, allPlayers[i].id]);
  }

  await pool.query('UPDATE vibetb_game_rooms SET status = ?, current_round = 1 WHERE id = ?', ['playing', room.id]);
  ctx.body = { message: '游戏开始' };
});

router.get('/game/rooms/:code', requireAuth, async (ctx) => {
  const [rooms] = await pool.query('SELECT * FROM vibetb_game_rooms WHERE room_code = ?', [ctx.params.code]);
  if (rooms.length === 0) { ctx.status = 404; ctx.body = { error: '房间不存在' }; return; }
  const room = rooms[0];

  const [players] = await pool.query(
    `SELECT p.id, p.role, p.is_alive, p.word, u.name, u.employee_id
     FROM vibetb_game_players p JOIN vibetb_users u ON p.user_id = u.id
     WHERE p.room_id = ?`, [room.id]
  );
  const [votes] = await pool.query(
    'SELECT * FROM vibetb_game_votes WHERE room_id = ? AND round_no = ?', [room.id, room.current_round]
  );

  const myPlayer = players.find(p => p.id ===
    (ctx.session.user ? players.find(pp => {
      // Find the player that matches current user
      const [up] = require('child_process').execSync ? [] : [];
      return false;
    }) : null)
  );

  // Better way: find by user_id
  const [myRows] = await pool.query('SELECT id, role, word FROM vibetb_game_players WHERE room_id = ? AND user_id = ?',
    [room.id, ctx.session.user.id]);

  ctx.body = {
    data: {
      ...room,
      players: players.map(p => ({
        id: p.id, name: p.name, employee_id: p.employee_id,
        is_alive: p.is_alive, is_me: myRows.length > 0 && p.id === myRows[0].id,
        role: myRows.length > 0 && p.id === myRows[0].id ? myRows[0].role : null,
        word: myRows.length > 0 && p.id === myRows[0].id ? myRows[0].word : null,
      })),
      votes: votes.map(v => ({ voter_id: v.voter_id, target_id: v.target_id })),
      my_role: myRows.length > 0 ? myRows[0].role : null,
      my_word: myRows.length > 0 ? myRows[0].word : null,
    },
  };
});

router.post('/game/rooms/:code/vote', requireAuth, async (ctx) => {
  const [rooms] = await pool.query('SELECT * FROM vibetb_game_rooms WHERE room_code = ?', [ctx.params.code]);
  if (rooms.length === 0) { ctx.status = 404; ctx.body = { error: '房间不存在' }; return; }
  const room = rooms[0];
  const [myRows] = await pool.query('SELECT id FROM vibetb_game_players WHERE room_id = ? AND user_id = ? AND is_alive = 1',
    [room.id, ctx.session.user.id]);
  if (myRows.length === 0) { ctx.status = 400; ctx.body = { error: '你不在游戏中或已出局' }; return; }

  const { target_id } = ctx.request.body;
  try {
    await pool.query(
      'INSERT INTO vibetb_game_votes (room_id, round_no, voter_id, target_id) VALUES (?,?,?,?)',
      [room.id, room.current_round, myRows[0].id, target_id]
    );
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') { ctx.body = { message: '本轮已投票' }; return; }
    throw e;
  }

  // 检查是否所有人都投了
  const [alive] = await pool.query(
    'SELECT COUNT(*) as cnt FROM vibetb_game_players WHERE room_id = ? AND is_alive = 1', [room.id]
  );
  const [voted] = await pool.query(
    'SELECT COUNT(DISTINCT voter_id) as cnt FROM vibetb_game_votes WHERE room_id = ? AND round_no = ?',
    [room.id, room.current_round]
  );

  if (voted[0].cnt >= alive[0].cnt) {
    // 找出得票最多的人
    const [topVoted] = await pool.query(
      `SELECT target_id, COUNT(*) as cnt FROM vibetb_game_votes
       WHERE room_id = ? AND round_no = ? GROUP BY target_id ORDER BY cnt DESC LIMIT 1`,
      [room.id, room.current_round]
    );
    if (topVoted.length > 0) {
      await pool.query('UPDATE vibetb_game_players SET is_alive = 0 WHERE id = ?', [topVoted[0].target_id]);
      const [eliminated] = await pool.query('SELECT role FROM vibetb_game_players WHERE id = ?', [topVoted[0].target_id]);

      // 检查游戏是否结束
      const [remaining] = await pool.query(
        `SELECT role, COUNT(*) as cnt FROM vibetb_game_players WHERE room_id = ? AND is_alive = 1 GROUP BY role`,
        [room.id]
      );
      const spiesLeft = remaining.find(r => r.role === 'spy')?.cnt || 0;
      const civsLeft = remaining.find(r => r.role === 'civilian')?.cnt || 0;

      let gameOver = false, winner = null;
      if (spiesLeft === 0) { gameOver = true; winner = 'civilian'; }
      else if (spiesLeft >= civsLeft) { gameOver = true; winner = 'spy'; }

      if (gameOver) {
        await pool.query('UPDATE vibetb_game_rooms SET status = ? WHERE id = ?', ['finished', room.id]);
      } else {
        await pool.query('UPDATE vibetb_game_rooms SET current_round = current_round + 1 WHERE id = ?', [room.id]);
      }

      ctx.body = {
        data: {
          eliminated: { id: topVoted[0].target_id, role: eliminated[0].role },
          game_over: gameOver, winner,
          remaining: { spies: spiesLeft, civilians: civsLeft },
        },
        message: gameOver ? `游戏结束！${winner === 'civilian' ? '平民' : '卧底'}获胜` : '投票结束，进入下一轮',
      };
      return;
    }
  }

  ctx.body = { message: '投票成功，等待其他玩家投票' };
});

// ============================================================
// 大巴出行
// ============================================================
router.post('/bus', requireAuth, async (ctx) => {
  const { location } = ctx.request.body;
  if (!location || !['linping', 'jiubao'].includes(location)) {
    ctx.status = 400; ctx.body = { error: '请选择出发地点' }; return;
  }
  await pool.query(
    'INSERT INTO vibetb_bus (user_id, location) VALUES (?,?) ON DUPLICATE KEY UPDATE location=VALUES(location)',
    [ctx.session.user.id, location]
  );
  ctx.body = { message: '大巴登记成功', data: { location } };
});

router.get('/bus', requireAuth, async (ctx) => {
  const [rows] = await pool.query('SELECT * FROM vibetb_bus WHERE user_id = ?', [ctx.session.user.id]);
  ctx.body = { data: rows[0] || null };
});

// ============================================================
// 管理后台（给 aiwork 调用）
// ============================================================
router.get('/admin/stats', async (ctx) => {
  const [[regCount]] = await pool.query('SELECT COUNT(*) as cnt FROM vibetb_registrations');
  const [[driverCount]] = await pool.query('SELECT COUNT(*) as cnt FROM vibetb_drivers');
  const [[passengerCount]] = await pool.query('SELECT COUNT(*) as cnt FROM vibetb_passengers');
  const [[checkinCount]] = await pool.query('SELECT COUNT(*) as cnt FROM vibetb_checkins');
  const [[busCount]] = await pool.query('SELECT COUNT(*) as cnt FROM vibetb_bus');
  ctx.body = {
    data: {
      registrations: regCount.cnt, drivers: driverCount.cnt,
      passengers: passengerCount.cnt, checkins: checkinCount.cnt,
      bus: busCount.cnt,
    },
  };
});

router.get('/admin/registrations', async (ctx) => {
  const [rows] = await pool.query(
    `SELECT r.*, u.name, u.employee_id FROM vibetb_registrations r JOIN vibetb_users u ON r.user_id = u.id ORDER BY r.created_at DESC`
  );
  ctx.body = { data: rows };
});

router.get('/admin/carpool', async (ctx) => {
  const [drivers] = await pool.query(
    `SELECT d.*, u.name, u.employee_id,
            (SELECT COUNT(*) FROM vibetb_passengers p WHERE p.driver_id = d.id) as passenger_count
     FROM vibetb_drivers d JOIN vibetb_users u ON d.user_id = u.id`
  );
  const [passengers] = await pool.query(
    `SELECT p.*, u.name, u.employee_id, du.name as driver_name
     FROM vibetb_passengers p JOIN vibetb_users u ON p.user_id = u.id
     LEFT JOIN vibetb_drivers d ON p.driver_id = d.id
     LEFT JOIN vibetb_users du ON d.user_id = du.id`
  );
  ctx.body = { data: { drivers, passengers } };
});

router.get('/admin/bus', async (ctx) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.name, u.employee_id FROM vibetb_bus b JOIN vibetb_users u ON b.user_id = u.id ORDER BY b.created_at DESC`
  );
  ctx.body = { data: rows };
});

// ============================================================
// 静态文件
// ============================================================
app.use(serve(path.join(__dirname, '../public')));

// API 路由
app.use(router.routes()).use(router.allowedMethods());

// SPA fallback: 非 API 请求返回 index.html
app.use(async (ctx) => {
  const fs = require('fs');
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    ctx.type = 'html';
    ctx.body = fs.readFileSync(indexPath, 'utf-8');
  }
});

const PORT = process.env.VTB_PORT || 3002;
app.listen(PORT, () => {
  console.log(`[VibeTB] Server running on http://localhost:${PORT}`);
});
