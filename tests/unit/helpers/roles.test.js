const expect = require('expect');
const { populateRole, updateRights } = require('../../../helpers/roles');
const Role = require('../../../models/Role');
const Right = require('../../../models/Right');

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
          permission: 'profiles:edit'
        }
      }
    ];

    const result = populateRole(rights);
    expect(result.length).toEqual(1);
    expect(result[0]).toEqual({
      right_id: '5b6952870366910014b88f03',
      name: '',
      permission: 'profiles:edit',
      description: 'Editer ses informations de profil',
      rolesConcerned: [],
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
          permission: 'profiles:edit'
        }
      },
      {
        hasAccess: false,
        rolesConcerned: [],
        _id: '1234567890',
        right_id: {
          _id: '12345678kjhgfh7890',
          description: 'Faire ses devoirs',
          permission: 'profiles:read'
        }
      }
    ];

    const result = populateRole(rights, { onlyGrantedRights: true });
    expect(result.length).toEqual(1);
    expect(result[0]).toEqual({
      right_id: '5b6952870366910014b88f03',
      name: '',
      permission: 'profiles:edit',
      description: 'Editer ses informations de profil',
      rolesConcerned: [],
      hasAccess: true,
    });
  });
});

describe('updateRights', () => {
  it('should throw a not found exception as role is undefined', async () => {
    Role.findById = () => {};
    try {
      await updateRights(123456789, {});
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(404);
      expect(e.output.payload.message).toEqual('Role non trouvé.');
    }
  });

  it('should throw a not found exception as rights are undefined', async () => {
    Role.findById = () => ({
      name: 'Test',
      _id: '5c261f6d1541d61c47d51085',
    });

    Right.find = () => ([]);
    try {
      await updateRights(123456789, {});
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(404);
      expect(e.output.payload.message).toEqual('Droits non trouvés.');
    }
  });
});
