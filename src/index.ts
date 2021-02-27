import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const loggedInPage = await login(page);
  const attendancePage = await visitAttendancePage(browser, loggedInPage);
  const workedHours = await attendancePage.$eval(
    "#search-result > div.row > div:nth-child(3) > div > div.card-body > table > tbody > tr:nth-child(1) > td > span",
    (e) => {
      const workedTimeStr = e.textContent; // e.g. "33:04"
      const [hours, minutes] = workedTimeStr.split(":");
      return parseFloat(hours) + parseFloat(minutes) / 60;
    }
  );

  const workedDays = await attendancePage.$eval(
    "#search-result > div.row > div:nth-child(2) > div > div.card-body > table > tbody > tr:nth-child(1) > td > span",
    (e) => parseInt(e.textContent)
  );

  // const overtime =
  //   process.argv[process.argv.length - 1] !== "--holiday"
  //     ? workedHours - workedDays * 8 // 出勤日当日の午後以降に確認する用
  //     : workedHours - (workedDays - 1) * 8; // 出勤日当日の朝や休日などに確認する用
  // TODO: 平日に実働日数が増えるタイミングを確認して、不要ならば上記のコードと $ npm run start:holiday は消す
  const overtime = workedHours - workedDays * 8;
  const formattedOvertime = `${Math.floor(overtime)} 時間 ${Math.floor(
    (overtime - Math.floor(overtime)) * 60
  )} 分`;
  console.log(formattedOvertime);

  await browser.close();
})();

// メールアドレスとパスワードを入力して「ログイン」ボタンをクリックする
const login = async (page: puppeteer.Page): Promise<puppeteer.Page> => {
  await page.goto("https://id.jobcan.jp/users/sign_in");
  await page.type("#user_email", process.env.MY_EMAIL);
  await page.type("#user_password", process.env.MY_PASSWORD);
  await Promise.all([
    page.waitForNavigation(),
    page.click("#new_user > input.form__login"),
  ]);
  return page;
};

const visitAttendancePage = async (
  browser: puppeteer.Browser,
  page: puppeteer.Page
): Promise<puppeteer.Page> => {
  // https://id.jobcan.jp/account/profile で「勤怠」リンクをクリックする
  await page.click("#jbc-app-links > ul > li:nth-child(2) > a");
  await page.waitForTimeout(3000);

  // 新しいタブで https://ssl.jobcan.jp/employee が開くので、タブ遷移して「出勤簿」リンクをクリックする
  const pages = await browser.pages();
  const lastPage = pages[pages.length - 1];
  await lastPage.bringToFront();
  await Promise.all([
    lastPage.waitForNavigation(),
    lastPage.click("#sidemenu > div.flex-shrink-0 > div > a:nth-child(1)"),
  ]);
  return lastPage;
};
