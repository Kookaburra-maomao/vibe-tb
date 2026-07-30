-- Vibe TB H5 团建报名 — 数据库迁移（前缀 vibetb_）
-- 执行: mysql -h <host> -u <user> -p aiwork < migrate.sql

CREATE TABLE IF NOT EXISTS vibetb_users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_registrations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  phone VARCHAR(20) NULL,
  id_card VARCHAR(18) NULL COMMENT '身份证号',
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES vibetb_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_drivers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  total_seats INT NOT NULL DEFAULT 4,
  plate VARCHAR(20) NULL,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES vibetb_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_passengers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  driver_id BIGINT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES vibetb_users(id),
  FOREIGN KEY (driver_id) REFERENCES vibetb_drivers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_checkins (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  activity_type VARCHAR(40) NOT NULL COMMENT 'board_game/frisbee/paddleboard/barbecue',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_activity (user_id, activity_type),
  FOREIGN KEY (user_id) REFERENCES vibetb_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_game_rooms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_code VARCHAR(8) NOT NULL UNIQUE,
  host_id BIGINT NOT NULL,
  total_players INT NOT NULL DEFAULT 6,
  spy_count INT NOT NULL DEFAULT 1,
  category VARCHAR(40) NOT NULL DEFAULT 'random',
  civilian_word VARCHAR(100) NULL,
  spy_word VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' COMMENT 'waiting/playing/finished',
  current_round INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES vibetb_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_game_players (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'civilian' COMMENT 'civilian/spy',
  word VARCHAR(100) NULL,
  is_alive TINYINT DEFAULT 1,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES vibetb_game_rooms(id),
  FOREIGN KEY (user_id) REFERENCES vibetb_users(id),
  UNIQUE KEY uk_room_user (room_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_game_votes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT NOT NULL,
  round_no INT NOT NULL,
  voter_id BIGINT NOT NULL,
  target_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES vibetb_game_rooms(id),
  FOREIGN KEY (voter_id) REFERENCES vibetb_game_players(id),
  FOREIGN KEY (target_id) REFERENCES vibetb_game_players(id),
  UNIQUE KEY uk_round_voter (room_id, round_no, voter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_bus (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  location VARCHAR(40) NOT NULL COMMENT 'linping/jiubao',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES vibetb_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vibetb_word_bank (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(40) NOT NULL,
  civilian_word VARCHAR(100) NOT NULL,
  spy_word VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- 内置词库（4 类 × 20 组 = 80 组）
-- =============================================
INSERT INTO vibetb_word_bank (category, civilian_word, spy_word) VALUES
('动物','老虎','狮子'),
('动物','大象','犀牛'),
('动物','熊猫','北极熊'),
('动物','长颈鹿','斑马'),
('动物','海豚','鲸鱼'),
('动物','企鹅','海鸥'),
('动物','袋鼠','兔子'),
('动物','孔雀','鹦鹉'),
('动物','蝴蝶','蜻蜓'),
('动物','金鱼','锦鲤'),
('动物','松鼠','仓鼠'),
('动物','老鹰','秃鹫'),
('动物','鳄鱼','蜥蜴'),
('动物','蜜蜂','黄蜂'),
('动物','变色龙','壁虎'),
('动物','考拉','树懒'),
('动物','河马','犀牛'),
('动物','章鱼','乌贼'),
('动物','丹顶鹤','白鹭'),
('动物','藏羚羊','梅花鹿'),
('电影','泰坦尼克号','阿凡达'),
('电影','复仇者联盟','正义联盟'),
('电影','速度与激情','极品飞车'),
('电影','哈利波特','纳尼亚传奇'),
('电影','西游记之大圣归来','哪吒之魔童降世'),
('电影','流浪地球','星际穿越'),
('电影','疯狂的石头','疯狂的赛车'),
('电影','无间道','窃听风云'),
('电影','少林足球','功夫足球'),
('电影','霸王别姬','梅兰芳'),
('电影','让子弹飞','一步之遥'),
('电影','东邪西毒','东成西就'),
('电影','赌神','赌圣'),
('电影','食神','满汉全席'),
('电影','英雄','十面埋伏'),
('电影','头号玩家','失控玩家'),
('电影','海王','雷神'),
('电影','蜘蛛侠','蝙蝠侠'),
('电影','冰雪奇缘','勇敢传说'),
('电影','寻梦环游记','飞屋环游记'),
('职业','医生','护士'),
('职业','老师','教授'),
('职业','警察','保安'),
('职业','律师','法官'),
('职业','程序员','产品经理'),
('职业','设计师','美工'),
('职业','记者','编辑'),
('职业','消防员','救生员'),
('职业','快递员','外卖员'),
('职业','演员','歌手'),
('职业','厨师','烘焙师'),
('职业','司机','教练'),
('职业','导游','翻译'),
('职业','销售','客服'),
('职业','会计师','审计师'),
('职业','建筑师','施工员'),
('职业','飞行员','空姐'),
('职业','船长','水手'),
('职业','农夫','园丁'),
('职业','科学家','研究员'),
('食物','火锅','冒菜'),
('食物','饺子','馄饨'),
('食物','汉堡','三明治'),
('食物','披萨','馅饼'),
('食物','寿司','刺身'),
('食物','蛋糕','面包'),
('食物','巧克力','糖果'),
('食物','冰淇淋','雪糕'),
('食物','麻婆豆腐','宫保鸡丁'),
('食物','北京烤鸭','南京盐水鸭'),
('食物','小笼包','灌汤包'),
('食物','煎饼果子','鸡蛋灌饼'),
('食物','酸辣粉','螺蛳粉'),
('食物','奶茶','奶昔'),
('食物','羊肉串','烤牛排'),
('食物','炸鸡','烤鸡'),
('食物','糖葫芦','棉花糖'),
('食物','粽子','月饼'),
('食物','方便面','挂面'),
('食物','西瓜','哈密瓜');
