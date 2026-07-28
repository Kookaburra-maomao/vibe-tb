import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({ baseURL: '/vibetb/api', withCredentials: true });
// 智能选择格式：大图用 WebP（体积小 80%+），小图和 fallback 用 PNG
const ASSET = (name, preferWebP = false) => {
  if (preferWebP && name.endsWith('.png')) {
    const webp = name.replace('.png', '.webp');
    return `/vibetb/assets/${webp}`;
  }
  return `/vibetb/assets/${name}`;
};

// ============================================================
// Hooks
// ============================================================
function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    API.get('/auth/me').then(r => setUser(r.data.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  return { user, setUser, loading };
}

// ============================================================
// Layout
// ============================================================
function Page({ title, backTo, children, extra }) {
  const nav = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#fdf6ee', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f0e8d8', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {backTo && <span onClick={() => nav(backTo)} style={{ fontSize: 20, cursor: 'pointer' }}>←</span>}
          <span style={{ fontSize: 16, fontWeight: 700, color: '#c77d3a' }}>{title}</span>
        </div>
        {extra}
      </div>
      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, type = 'primary', onClick, block, disabled, style }) {
  const colors = { primary: { bg: '#e8883a', text: '#fff' }, outline: { bg: '#fff', text: '#c77d3a', border: '2px solid #c77d3a' }, ghost: { bg: 'transparent', text: '#c77d3a' } };
  const c = colors[type] || colors.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: block ? '100%' : 'auto', padding: '12px 24px', fontSize: 15, fontWeight: 600,
      borderRadius: 10, border: c.border || 'none', background: c.bg, color: c.text,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      boxShadow: type === 'primary' ? '0 3px 12px rgba(232,136,58,0.3)' : 'none',
      ...style,
    }}>{children}</button>
  );
}

function Input({ label, value, onChange, placeholder, type, ...props }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{label}</div>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={type || 'text'} {...props}
        style={{ width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 8, border: '1px solid #e0d5c5', background: '#fff', outline: 'none' }} />
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 12, ...style }}>{children}</div>;
}

// ============================================================
// Pages
// ============================================================

function LoginPage() {
  const nav = useNavigate();
  const [eid, setEid] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useUser();

  useEffect(() => { if (user) nav('/'); }, [user]);

  const login = async () => {
    if (!eid.trim() || !name.trim()) return alert('请输入工号和姓名');
    setLoading(true);
    try {
      const r = await API.post('/auth/login', { employee_id: eid.trim(), name: name.trim() });
      setUser(r.data.data);
      nav('/');
    } catch { alert('登录失败'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 0 60px', background: `url(${ASSET('home-title-background.png', true)}) center/cover` }}>
      <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <img src={ASSET('09-team-badge.png')} style={{ width: 80, marginBottom: 16 }} alt="" />
        <h2 style={{ color: '#c77d3a', marginBottom: 4 }}>2026 杭研院团建</h2>
        <p style={{ color: '#999', fontSize: 13, marginBottom: 24 }}>输入工号和姓名即可登录</p>
        <Input value={eid} onChange={setEid} placeholder="工号" />
        <Input value={name} onChange={setName} placeholder="姓名" />
        <Btn block onClick={login} disabled={loading}>{loading ? '登录中...' : '登录 / 注册'}</Btn>
      </div>
    </div>
  );
}

function HomePage() {
  const nav = useNavigate();
  const { user, loading } = useUser();
  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>加载中...</div>;
  if (!user) { nav('/login'); return null; }

  const items = [
    { icon: '05-group.png', label: '我要报名', path: '/register', color: '#e8883a' },
    { icon: '01-car.png', label: '拼车出行', path: '/carpool', color: '#5b8c5a' },
    { icon: '03-calendar-check.png', label: '活动打卡', path: '/checkin', color: '#4a90d9' },
    { icon: '10-camera-badge.png', label: '小游戏', path: '/games', color: '#c77d3a' },
  ];

  return <Page title="2026 杭研院团建">
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 20, minHeight: 420 }}>
      <img src={ASSET('home-title-background.png', true)} style={{ width: '100%', display: 'block' }} alt="" />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(255,255,255,0.95) 40%)',
        padding: '60px 16px 16px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {items.map((item, i) => (
            <div key={i} onClick={() => nav(item.path)} style={{
              background: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: '20px 12px',
              textAlign: 'center', cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)', backdropFilter: 'blur(4px)',
            }}>
              <img src={ASSET(item.icon)} style={{ width: 48, marginBottom: 8 }} alt="" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <Btn type="ghost" onClick={() => { API.post('/auth/login', { employee_id: user.employee_id, name: user.name }); nav('/login'); }}>退出登录</Btn>
    </div>
  </Page>;
}

function RegisterPage() {
  const nav = useNavigate();
  const { user } = useUser();
  const [phone, setPhone] = useState('');
  const [registered, setRegistered] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    API.get('/registration').then(r => {
      if (r.data.data?.length) {
        const mine = r.data.data.find(d => d.user_id === user?.id);
        if (mine) { setPhone(mine.phone || ''); setNote(mine.note || ''); setRegistered(true); }
      }
    }).catch(() => {});
  }, [user]);

  const submit = async () => {
    if (!phone.trim()) return alert('请输入手机号');
    await API.post('/registration', { phone: phone.trim(), note });
    setRegistered(true);
    alert('报名成功！');
  };

  return <Page title="我要报名" backTo="/">
    <Card>
      <img src={ASSET('06-phone.png')} style={{ width: 48, display: 'block', margin: '0 auto 12px' }} alt="" />
      <Input label="手机号" value={phone} onChange={setPhone} placeholder="输入手机号即可报名" type="tel" />
      <Input label="备注（可选）" value={note} onChange={setNote} placeholder="如：自驾前往" />
      <Btn block onClick={submit}>{registered ? '更新报名信息' : '立即报名'}</Btn>
      {registered && <p style={{ textAlign: 'center', color: '#52c41a', marginTop: 8, fontSize: 13 }}>✅ 已报名</p>}
    </Card>
  </Page>;
}

function CarpoolPage() {
  const nav = useNavigate();
  return <Page title="拼车出行" backTo="/">
    <Card>
      <img src={ASSET('01-car.png')} style={{ width: 60, display: 'block', margin: '0 auto 12px' }} alt="" />
      <p style={{ textAlign: 'center', color: '#666', marginBottom: 20, fontSize: 14 }}>选择你的出行方式</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <div onClick={() => nav('/carpool/driver')} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
          <img src={ASSET('btn-driver.png')} style={{ width: '100%', borderRadius: 10 }} alt="" />
        </div>
        <div onClick={() => nav('/carpool/list')} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
          <img src={ASSET('btn-passenger.png')} style={{ width: '100%', borderRadius: 10 }} alt="" />
        </div>
      </div>
    </Card>
  </Page>;
}

function CarpoolDriverPage() {
  const nav = useNavigate();
  const [seats, setSeats] = useState(4);
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);
  const [my, setMy] = useState(null);

  useEffect(() => {
    API.get('/carpool/my').then(r => {
      if (r.data.data?.driver) { setSeats(r.data.data.driver.total_seats); setPlate(r.data.data.driver.plate || ''); setMy('driver'); }
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setSaving(true);
    await API.post('/carpool/driver', { total_seats: seats, plate: plate.trim() || null });
    setSaving(false);
    alert('登记成功！');
    setMy('driver');
  };

  const cancelDriver = async () => {
    // Switch back to passenger
    await API.post('/carpool/passenger', { driver_id: null });
    setMy(null);
    alert('已取消车主身份');
    nav('/carpool');
  };

  return <Page title="我是车主" backTo="/carpool">
    <Card>
      <img src={ASSET('btn-driver.png')} style={{ width: '100%', borderRadius: 10, marginBottom: 16 }} alt="" />
      <Input label="总座位数（含司机）" value={seats} onChange={v => setSeats(parseInt(v) || 4)} type="number" />
      <Input label="车牌号（可选）" value={plate} onChange={setPlate} placeholder="浙A·12345" />
      <Btn block onClick={submit} disabled={saving}>{my === 'driver' ? '更新信息' : '登记为车主'}</Btn>
      {my === 'driver' && <Btn type="ghost" block onClick={cancelDriver} style={{ marginTop: 8 }}>取消车主身份</Btn>}
    </Card>
  </Page>;
}

function CarpoolListPage() {
  const nav = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [my, setMy] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    API.get('/carpool/drivers').then(r => setDrivers(r.data.data || [])).catch(() => {});
    API.get('/carpool/my').then(r => setMy(r.data.data)).catch(() => {});
  }, []);

  const joinCar = async (driverId) => {
    await API.post('/carpool/passenger', { driver_id: driverId });
    alert('已加入该车！');
    API.get('/carpool/drivers').then(r => setDrivers(r.data.data || [])).catch(() => {});
    API.get('/carpool/my').then(r => setMy(r.data.data)).catch(() => {});
  };

  const leaveCar = async () => {
    await API.post('/carpool/passenger', { driver_id: null });
    alert('已退出拼车');
    API.get('/carpool/drivers').then(r => setDrivers(r.data.data || [])).catch(() => {});
    API.get('/carpool/my').then(r => setMy(r.data.data)).catch(() => {});
  };

  return <Page title="选择拼车" backTo="/carpool">
    {my?.driver && <Card><p style={{ textAlign: 'center', color: '#999' }}>你是车主，无法乘车</p></Card>}
    {my?.passenger && (
      <Card>
        <p style={{ textAlign: 'center', color: '#5b8c5a', fontWeight: 600 }}>
          🚗 已加入 {my.passenger.driver_id ? '拼车' : '等待中'}
        </p>
        {my.passenger.driver_id && <Btn type="ghost" block onClick={leaveCar} style={{ marginTop: 8 }}>退出拼车</Btn>}
      </Card>
    )}
    {!my?.driver && !my?.passenger && !my?.driver && (
      <Btn type="outline" block onClick={() => nav('/carpool/driver')} style={{ marginBottom: 16 }}>我要当车主</Btn>
    )}
    {drivers.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>暂无车主，快去当第一个吧！</p>}
    {drivers.map(d => {
      const mySeat = my?.passenger?.driver_id === d.id;
      return (
        <Card key={d.id} style={{ background: mySeat ? '#f6ffed' : '#fff', border: mySeat ? '2px solid #b7eb8f' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{d.name} {d.plate ? `· ${d.plate}` : ''}</div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                🚗 已载 {d.passenger_count} 人 · 共 {d.total_seats} 座 · 余 {Math.max(0, d.total_seats - 1 - d.passenger_count)} 座
                {d.note && <span style={{ marginLeft: 8 }}>💬 {d.note}</span>}
              </div>
            </div>
            {!my?.driver && (
              mySeat
                ? <Btn type="outline" onClick={leaveCar}>退出</Btn>
                : <Btn type="outline" onClick={() => joinCar(d.id)}
                    disabled={d.passenger_count >= d.total_seats - 1}>上车</Btn>
            )}
          </div>
        </Card>
      );
    })}
  </Page>;
}

function CheckinPage() {
  const nav = useNavigate();
  const [stats, setStats] = useState([]);
  const [updating, setUpdating] = useState(null);

  const activities = [
    { key: 'board_game', label: '团队桌游', img: 'activity-board-game.webp' },
    { key: 'frisbee', label: '趣味飞盘', img: 'activity-frisbee.webp' },
    { key: 'paddleboard', label: '水上桨板', img: 'activity-paddleboard.webp' },
    { key: 'barbecue', label: '烧烤时光', img: 'activity-barbecue.webp' },
  ];

  useEffect(() => {
    API.get('/checkin').then(r => setStats(r.data.stats || [])).catch(() => {});
  }, []);

  const checkin = async (key) => {
    setUpdating(key);
    try {
      await API.post('/checkin', { activity_type: key });
      API.get('/checkin').then(r => setStats(r.data.stats || [])).catch(() => {});
    } catch { alert('打卡失败'); }
    finally { setUpdating(null); }
  };

  return <Page title="活动打卡" backTo="/">
    <p style={{ textAlign: 'center', color: '#666', marginBottom: 16, fontSize: 14 }}>
      点击下方活动卡片完成打卡，每个活动限打一次
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {activities.map(a => {
        const s = stats.find(st => st.activity_type === a.key) || { count: 0, checked: false };
        return (
          <div key={a.key} onClick={() => checkin(a.key)} style={{
            background: '#fff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', opacity: s.checked ? 0.6 : 1,
            border: s.checked ? '2px solid #52c41a' : 'none',
          }}>
            <img src={ASSET(a.img)} loading="lazy" decoding="async" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} alt="" />
            <div style={{ padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                {s.checked ? '✅ 已打卡' : `${s.count} 人已打卡`}
                {updating === a.key ? ' ...' : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </Page>;
}

function GamesPage() {
  const nav = useNavigate();
  return <Page title="小游戏" backTo="/">
    <Card>
      <div onClick={() => nav('/games/undercover')} style={{ textAlign: 'center', cursor: 'pointer', padding: 20 }}>
        <img src={ASSET('08-leaf-badge.png')} style={{ width: 64, marginBottom: 8 }} alt="" />
        <div style={{ fontSize: 16, fontWeight: 700, color: '#c77d3a' }}>谁是卧底</div>
        <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>经典聚会推理游戏，支持 4-12 人</div>
      </div>
    </Card>
  </Page>;
}

function UndercoverGamePage() {
  const nav = useNavigate();
  const [room, setRoom] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [myWord, setMyWord] = useState(null);
  const [code, setCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [votes, setVotes] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRoom = useCallback(async (roomCode) => {
    try {
      const r = await API.get(`/game/rooms/${roomCode}`);
      setRoom(r.data.data);
      setMyRole(r.data.data.my_role);
      setMyWord(r.data.data.my_word);
      setPlayers(r.data.data.players || []);
      setVotes(r.data.data.votes || []);
    } catch { setRoom(null); }
  }, []);

  const createRoom = async () => {
    const total = prompt('玩家人数（4-12）：', '6');
    if (!total) return;
    const spies = prompt('卧底人数：', '1');
    if (!spies) return;
    const cat = prompt('词语分类（动物/电影/职业/食物/随机）：', '随机');
    setLoading(true);
    try {
      const r = await API.post('/game/rooms', { total_players: parseInt(total), spy_count: parseInt(spies), category: cat || 'random' });
      setCode(r.data.data.room_code);
      setMyRole(r.data.data.your_role);
      setMyWord(r.data.data.your_word);
      await fetchRoom(r.data.data.room_code);
    } catch { alert('创建失败'); }
    finally { setLoading(false); }
  };

  const joinRoom = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return alert('请输入房间码');
    try {
      const r = await API.post(`/game/rooms/${c}/join`);
      setMyRole(r.data.data.role);
      setMyWord(r.data.data.word);
      await fetchRoom(c);
    } catch (e) { alert(e.response?.data?.error || '加入失败'); }
  };

  const startGame = async () => {
    await API.post(`/game/rooms/${room.room_code}/start`);
    await fetchRoom(room.room_code);
  };

  const vote = async (targetId) => {
    try {
      const r = await API.post(`/game/rooms/${room.room_code}/vote`, { target_id: targetId });
      if (r.data.data?.game_over) {
        setGameResult(r.data.data);
      }
      await fetchRoom(room.room_code);
    } catch (e) { alert(e.response?.data?.error || '投票失败'); }
  };

  // Auto-refresh for playing rooms
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    const timer = setInterval(() => fetchRoom(room.room_code), 5000);
    return () => clearInterval(timer);
  }, [room?.room_code, room?.status]);

  if (gameResult) {
    return <Page title="游戏结束" backTo="/games">
      <Card>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <img src={ASSET('08-leaf-badge.png')} style={{ width: 80, marginBottom: 12 }} alt="" />
          <h2 style={{ color: gameResult.winner === 'civilian' ? '#52c41a' : '#e8883a' }}>
            {gameResult.winner === 'civilian' ? '🎉 平民获胜！' : '🕵️ 卧底获胜！'}
          </h2>
          <p style={{ color: '#666', marginTop: 8 }}>被淘汰的玩家是卧底吗？猜对了吗？</p>
          <Btn block onClick={() => { setRoom(null); setGameResult(null); setCode(''); }} style={{ marginTop: 16 }}>再来一局</Btn>
        </div>
      </Card>
    </Page>;
  }

  // Not in a room
  if (!room) {
    return <Page title="谁是卧底" backTo="/games">
      <Card>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <img src={ASSET('08-leaf-badge.png')} style={{ width: 64, marginBottom: 12 }} alt="" />
          <h3 style={{ color: '#c77d3a' }}>谁是卧底</h3>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
            每人获得一个词语，其中卧底拿到相似但不同的词。
            <br />每轮描述你的词，投票找出卧底！
          </p>
          <Btn block onClick={createRoom} disabled={loading} style={{ marginBottom: 12 }}>
            {loading ? '创建中...' : '创建房间'}
          </Btn>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Input value={code} onChange={setCode} placeholder="输入房间码" style={{ flex: 2 }} />
            <Btn onClick={joinRoom} style={{ flex: 1 }}>加入</Btn>
          </div>
        </div>
      </Card>
    </Page>;
  }

  // In a room
  const alivePlayers = players.filter(p => p.is_alive);
  const myVote = votes.find(v => v.voter_id === players.find(p => p.is_me)?.id);
  const allVoted = votes.length >= alivePlayers.length;

  return <Page title={`房间 ${room.room_code}`} backTo="/games">
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#888' }}>
          词语分类：{room.category} · {room.total_players}人 · {room.spy_count}卧底
          {room.status === 'waiting' ? ' · 等待开始' : ` · 第${room.current_round}轮`}
        </div>
        {myRole && <div style={{ marginTop: 8, padding: '10px 16px', background: myRole === 'spy' ? '#fff2f0' : '#f6ffed', borderRadius: 8, display: 'inline-block' }}>
          <div style={{ fontSize: 12, color: '#888' }}>你的身份：{myRole === 'spy' ? '🕵️ 卧底' : '👤 平民'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#c77d3a' }}>{myWord}</div>
        </div>}
      </div>

      {room.status === 'waiting' && room.host_id === players.find(p => p.is_me)?.id && players.length >= 4 && (
        <Btn block onClick={startGame}>开始游戏（{players.length}人）</Btn>
      )}
      {room.status === 'waiting' && players.length < 4 && (
        <p style={{ textAlign: 'center', color: '#999' }}>等待更多玩家加入...（至少4人）</p>
      )}

      {room.status === 'playing' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            {alivePlayers.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', marginBottom: 4, background: '#f9f6f0', borderRadius: 8,
                opacity: p.is_alive ? 1 : 0.4,
              }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  {p.is_me && <span style={{ fontSize: 11, color: '#c77d3a', marginLeft: 4 }}>(你)</span>}
                  {!p.is_alive && <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>已出局</span>}
                  {myVote && myVote.target_id === p.id && <span style={{ fontSize: 11, color: '#e8883a', marginLeft: 4 }}>你投了TA</span>}
                </div>
                {p.is_alive && !p.is_me && !myVote && (
                  <Btn type="ghost" onClick={() => vote(p.id)} style={{ padding: '4px 12px', fontSize: 12 }}>投票</Btn>
                )}
              </div>
            ))}
          </div>
          {myVote && !allVoted && <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>已投票，等待其他玩家...</p>}
          {allVoted && <p style={{ textAlign: 'center', color: '#e8883a', fontSize: 13 }}>所有人已投票，等待结算...</p>}
          <p style={{ textAlign: 'center', color: '#888', fontSize: 11, marginTop: 8 }}>
            房间码：{room.room_code}（分享给好友加入）
          </p>
        </div>
      )}
    </Card>
  </Page>;
}

// ============================================================
// App Entry
// ============================================================
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/carpool" element={<CarpoolPage />} />
      <Route path="/carpool/driver" element={<CarpoolDriverPage />} />
      <Route path="/carpool/list" element={<CarpoolListPage />} />
      <Route path="/checkin" element={<CheckinPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/games/undercover" element={<UndercoverGamePage />} />
    </Routes>
  );
}
