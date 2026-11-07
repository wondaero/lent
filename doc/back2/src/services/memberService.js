// services/memberService.js
const memberModel = require("../models/memberModel");

// 전체 멤버 목록
async function getMemberList(params) {
    params.limit = params.perPage;
    params.offset =  (params.curPageIdx - 1) * params.perPage;
    
    const members = await memberModel.getMemberList(params);

    //페이지내이션없이(그러므로 카운트도 필요 없음)
    if(params.all === 'true'){
      return {memberList: members[0]};
    }

    let membersCnt;

    if(params.filter === 'all'){
        membersCnt = await memberModel.getMemberCount(params);
    }else if(params.filter === 'ing' || params.filter === 'over'){
        membersCnt = await memberModel.getFilteredMemberCount(params);
    }

    return {
        memberList: members[0],
        membersCnt: membersCnt[0][0].CNT
    };
}

/**
 * 특정 멤버 조회(나중에 return 값 [0][0] 바꿀 수도 있음)
 * @param {*} id 
 * @returns 
 */
async function getMemberDetail(id) {
    const member = await memberModel.getMemberDetail(id);

    if (!member) {
      throw new Error("Member not found");
    }
    return member[0][0];
}


/**
 * 대여/반납 페이지에서 회원 찾을 때(나중에 return 값 [0][0] 바꿀 수도 있음)
 * @param {*} id 회원 아이디
 * @returns 
 */
async function getMemberDetailWithBook(id) {
  const member = await memberModel.getMemberDetailWithBook(id);

  if (!member) {
    throw new Error("Member not found");
  }
  return member[0][0];
}


// 멤버 추가
async function addMember(params) {
    const newMember = await memberModel.addMember(params);
    if (!newMember) {
      throw new Error('Failed to create member');
    }
    return {id: newMember[0].insertId};
}

// 멤버 수정
async function updateMember(id, params) {
  const updateMember = await memberModel.updateMember(id, params);
  if (!updateMember) {
    throw new Error("Failed to update member");
  }
  return {id};
}

// 멤버 삭제
async function deleteMember(id) {
  const deletedMember = await memberModel.deleteMember(id);
  if (!deletedMember) {
    throw new Error("Failed to delete member");
  }
  return await deletedMember;
}


module.exports = {
  getMemberList,
  getMemberDetail,
  addMember,
  updateMember,
  deleteMember,

  getMemberDetailWithBook,
};
