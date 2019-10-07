const expect = require('expect');
const { populateRole } = require('../../../src/helpers/roles');

describe('populateRole', () => {
  it('should update rights without options', () => {
    const rights = [
      {
        hasAccess: true,
        rolesConcerned: [],
        _id: '5c262187a3fa3422b8793fe8',
        right_id: {
          _id: '5b6952870366910014b88f03',
          description: 'Editer ses informations de profil',
          permission: 'profiles:edit',
        },
      },
    ];

    const result = populateRole(rights);
    expect(result.length).toEqual(1);
    expect(result[0]).toEqual({
      right_id: '5b6952870366910014b88f03',
      permission: 'profiles:edit',
      description: 'Editer ses informations de profil',
      hasAccess: true,
    });
  });

  it('should update rights without options', () => {
    const rights = [
      {
        hasAccess: true,
        rolesConcerned: [],
        _id: '5c262187a3fa3422b8793fe8',
        right_id: {
          _id: '5b6952870366910014b88f03',
          description: 'Editer ses informations de profil',
          permission: 'profiles:edit',
        },
      },
      {
        hasAccess: false,
        rolesConcerned: [],
        _id: '1234567890',
        right_id: {
          _id: '12345678kjhgfh7890',
          description: 'Faire ses devoirs',
          permission: 'profiles:read',
        },
      },
    ];

    const result = populateRole(rights, { onlyGrantedRights: true });
    expect(result.length).toEqual(1);
    expect(result[0]).toEqual({
      right_id: '5b6952870366910014b88f03',
      permission: 'profiles:edit',
      description: 'Editer ses informations de profil',
      hasAccess: true,
    });
  });
});
