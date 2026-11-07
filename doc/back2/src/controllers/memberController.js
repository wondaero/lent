// 서비스 불러오기
const memberService = require("../services/memberService");

async function getMemberList(req, res) {
  try {
    const members = await memberService.getMemberList(req.query);
    res.json(members);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * 회원 조회(상세)
 * @param {*} req id는 필수이고 withBook은 선택(대여/반납 페이지에서 필요)
 * @param {*} res 
 * @returns 
 */
async function getMemberDetail(req, res) {
  try {

    const { id } = req.params;
    const { withBook } = req.query;
    

    if (withBook === 'true') {  // 대여/반납 페이지에서 빌린 책들과 함께 조회할 때
      const member = await memberService.getMemberDetailWithBook(id);
      return res.json(member);
    }

    //회원만 조회
    const member = await memberService.getMemberDetail(id);
    res.json(member);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


/**
 * 대여/반납 페이지에서 회원 찾을 때
 * @param {*} req 회원 아이디만 들어있을 듯
 * @param {*} res 
 */
async function getMemberDetailWithBook(req, res) {
  try {
    const member = await memberService.getMemberDetailWithBook(req.params.id);
    res.json(member);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addMember(req, res) {
  try {
    const newMember = req.body.params; // 클라이언트가 보낸 데이터
    const created = await memberService.addMember(newMember);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateMember(req, res) {
  try {
    const updatedMember = req.body.params; // 클라이언트가 보낸 데이터
    const updated = await memberService.updateMember(req.params.id, updatedMember); // 서비스에서 처리
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteMember(req, res) {
  try {
    const deleted = await memberService.deleteMember(req.params.id); // 서비스에서 처리
    res.status(201).json(deleted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}








// 외부에서 사용할 함수 내보내기
module.exports = {
    getMemberList,
    getMemberDetail,
    addMember,
    updateMember,
    deleteMember,

    getMemberDetailWithBook
};
