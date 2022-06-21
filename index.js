const prompts = require('prompts');
const axios = require('axios').default;
const chalk = require('chalk');

// TODO 只要替换用户名密码
let username = '';
let password = '';

const questions = [
  {
    type: 'text',
    name: 'username',
    message: '请输入您的账户?',
    validate: username => username.length ? true : '账号必填!!!'
  },
  {
    type: 'invisible',
    name: 'password',
    message: '请输入您的秘密?(直接回撤为默认密码123456)',
    initial: '123456'
  }
];

let token = {};
let user = {};
let chapters = [];
let last_time = {};

axios.defaults.baseURL = 'https://trainspace.cfnet.org.cn';

axios.interceptors.request.use((config) => {
  // console.dir(config);
  return config;
});

// 登录
const login = async () => {
  try {
    const {
      data
    } = await axios.post('/seniority/api/login', {
      username,
      password,
      "remember": true
    });
    if (data ?.code === 200) {
      token = data ?.data ??{};
      console.log(chalk.yellow.bold(`${username}登录成功！`));
    }
  } catch (error) {
    console.log(chalk.redBright.bold(error.message));
  }
}

// 获取用户信息
const getUser = async () => {
  try {
    const {
      data
    } = await axios.get('/seniority/api/user', {
      headers: {
        'Authorization': 'Bearer ' + token.access_token
      }
    });
    if (data ?.code === 200) {
      user = data ?.data ??{};
      console.log(chalk.yellow.bold('已成功获取用户信息！'));
    }
  } catch (error) {
    console.log(chalk.redBright.bold(error.message));
  }
}

//获取章节
const getuserstudy = async () => {
  try {
    const {
      data
    } = await axios.post('/collegeapi/api/zone/getuserstudy', {
      "jid": 1548,
      "uid": user.uid,
      "cid": "3058",
      "planid": "9284",
      "companyid": "697"
    }, {
      headers: {
        'Authorization': 'Bearer ' + token.access_token
      }
    });
    if (data ?.code === 200) {
      chapters = data ?.data ?.directory;
      last_time = data ?.data ?.last_time;
      console.log(chalk.yellow.bold('已成功获取课程信息！'));
    }
  } catch (error) {
    console.log(chalk.redBright.bold(error.message));
  }
}

// 学习
const learntime = async (chapter_id, section_id, resources_id, name) => {
  try {
    const {
      data
    } = await axios.post('/logsapi/sensorsdata/index/learntime', {
      "business_type": "enterprise",
      "channel_source": "1",
      "user_id": user.uid,
      "user_name": "",
      "user_role": "",
      "client_type": "web",
      "lib_type": "1",
      "os_type": "pc",
      "platform": "1",
      "period": 0,
      "group_id": "1548",
      "group_name": "",
      "classroom_id": 9284,
      "classroom_name": "",
      "classroom_type": 1,
      "course_id": 3058,
      "course_name": "",
      "course_type": "",
      chapter_id, // :185616, // 第一层
      "chapter_name": "",
      section_id, // :185617, // 第二层
      "section_name": "",
      "catalog_id": "",
      "catalog_name": "",
      resources_id, // : 185650, // 第三层
      "resources_name": "",
      "resource_time": "",
      "single_status": 1,
      "uuid": "476f0p7kehk0",
      "trainId": "844",
      "companyid": "697",
      "study_max_time": 21600,
      "is_end": 0,
      "position": 2.860288
    }, {
      headers: {
        'Authorization': 'Bearer ' + token.access_token
      }
    });
    const {
      data: {
        study_times,
        demand_time
      }
    } = data;
    const progress = ((study_times.match(/(\d+):/)[1] / demand_time.match(/(\d+):/)[1]) * 100).toFixed(2);
    console.log(chalk.greenBright.bold(`${name}: 当前进度为 ==> ${progress} %`));
    return data ?.data;
  } catch (error) {
    console.log(chalk.redBright.bold(error.message));
  }
}

// 格式化课程列表
const format = () => {
  const lists = [];
  chapters.forEach((f) => {
    f.forEach((s) => {
      s ?.part ?.forEach((t) => {
        t ?.cats ?.forEach((m) => {
          m.res.forEach((n) => {
            lists.push({
              chapter_id: s.id,
              section_id: t.id,
              resources_id: n.id,
              name: n.res_name + '.' + n.file_type,
            });
          });
        });
      });
    });
  });
  return lists;
}

// 递归刷进度
let index = 0;
let lists = [];
const skip = async () => {
  console.log(chalk.yellow.bold('已开始刷新视频进度！！！'));
  const {
    chapter_id,
    section_id,
    resources_id,
    name
  } = lists[index + 1];
  let data = await learntime(chapter_id, section_id, resources_id, name);
  const timer = setInterval(async () => {
    if (data ?.study_status === 3 || index >= lists.length) {
      console.log(chalk.redBright.bold(`${name} ==> done`));
      index++;
      clearInterval(timer);
      // await getuserstudy();
      skip(); // 递归
    } else {
      data = await learntime(chapter_id, section_id, resources_id, name);
    }
  }, 1000 * 60);
}

(async () => {
  try {
    const answer = await prompts(questions);
    username = answer.username;
    password = answer.password;
    if(!username || !password) { 
      process.exit();
      return;
    }
    await login();
    await getUser();
    await getuserstudy();
    lists = format();
    index = lists.findIndex((item) => item.resources_id === last_time ?.chapter_data ?.chapters_id);
    await skip()
  } catch (error) {
    console.log(chalk.redBright.bold(error.message));
  }
})();