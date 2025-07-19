import { 
  Shot, 
  Asset, 
  Task, 
  ProjectMember, 
  User, 
  ENTITY_KIND,
  EntityType 
} from '../../shared/types';

/**
 * Test data generator for creating realistic datasets for integration testing
 */
export class TestDataGenerator {
  private static instance: TestDataGenerator;
  private userCounter = 0;
  private shotCounter = 0;
  private assetCounter = 0;
  private taskCounter = 0;
  private memberCounter = 0;

  static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }

  reset(): void {
    this.userCounter = 0;
    this.shotCounter = 0;
    this.assetCounter = 0;
    this.taskCounter = 0;
    this.memberCounter = 0;
  }

  // User generation
  generateUser(overrides: Partial<User> = {}): User {
    const id = ++this.userCounter;
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    
    const name = names[(id - 1) % names.length];
    const domain = domains[(id - 1) % domains.length];
    
    return {
      user_id: `user_${id.toString().padStart(3, '0')}`,
      email: `${name.toLowerCase()}@${domain}`,
      name: `${name} User`,
      google_id: `google_${id}_${Date.now()}`,
      avatar_url: `https://avatar.example.com/${name.toLowerCase()}.jpg`,
      created_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      last_login: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      ...overrides
    };
  }

  generateUsers(count: number): User[] {
    return Array.from({ length: count }, () => this.generateUser());
  }

  // Shot generation
  generateShot(overrides: Partial<Shot> = {}): Shot {
    const id = ++this.shotCounter;
    const episodes = ['E01', 'E02', 'E03', 'E04', 'E05'];
    const statuses = ['not_started', 'in_progress', 'completed', 'on_hold', 'approved'];
    const priorities = [1, 2, 3, 4, 5];
    
    const episode = episodes[(id - 1) % episodes.length];
    const sceneNum = ((id - 1) % 20) + 1;
    
    return {
      shot_id: `shot_${id.toString().padStart(3, '0')}`,
      episode,
      scene: `S${sceneNum.toString().padStart(2, '0')}`,
      title: `Shot ${id} - ${this.generateShotTitle()}`,
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      due_date: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
      timecode_fps: '24',
      folder_label: `shot_${id.toString().padStart(3, '0')}`,
      folder_url: `https://drive.google.com/folders/shot_${id}`,
      thumbnails: [],
      file_list: [],
      versions: { latest: null, versions: [] },
      notes: this.generateNotes('shot'),
      ...overrides
    };
  }

  generateShots(count: number): Shot[] {
    return Array.from({ length: count }, () => this.generateShot());
  }

  // Asset generation
  generateAsset(overrides: Partial<Asset> = {}): Asset {
    const id = ++this.assetCounter;
    const assetTypes = ['character', 'prop', 'environment', 'vehicle', 'fx'];
    const statuses = ['concept', 'modeling', 'texturing', 'rigging', 'approved'];
    
    return {
      asset_id: `asset_${id.toString().padStart(3, '0')}`,
      name: `${this.generateAssetName()} ${id}`,
      asset_type: assetTypes[Math.floor(Math.random() * assetTypes.length)] as any,
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      overlap_sensitive: Math.random() > 0.7,
      folder_label: `asset_${id.toString().padStart(3, '0')}`,
      folder_url: `https://drive.google.com/folders/asset_${id}`,
      thumbnails: [],
      file_list: [],
      versions: { latest: null, versions: [] },
      notes: this.generateNotes('asset'),
      ...overrides
    };
  }

  generateAssets(count: number): Asset[] {
    return Array.from({ length: count }, () => this.generateAsset());
  }

  // Task generation
  generateTask(overrides: Partial<Task> = {}): Task {
    const id = ++this.taskCounter;
    const taskNames = ['Animation', 'Modeling', 'Texturing', 'Rigging', 'Lighting', 'Compositing', 'FX', 'Layout'];
    const statuses = ['not_started', 'assigned', 'in_progress', 'review', 'completed'];
    
    const startDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + (Math.random() * 14 + 1) * 24 * 60 * 60 * 1000);
    
    return {
      task_id: `task_${id.toString().padStart(3, '0')}`,
      name: taskNames[Math.floor(Math.random() * taskNames.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      assignee_id: `user_${Math.floor(Math.random() * 10 + 1).toString().padStart(3, '0')}`,
      start_date: startDate,
      end_date: endDate,
      shot_id: `shot_${Math.floor(Math.random() * 50 + 1).toString().padStart(3, '0')}`,
      folder_label: `task_${id.toString().padStart(3, '0')}`,
      folder_url: `https://drive.google.com/folders/task_${id}`,
      notes: this.generateNotes('task'),
      ...overrides
    };
  }

  generateTasks(count: number): Task[] {
    return Array.from({ length: count }, () => this.generateTask());
  }

  // Project member generation
  generateProjectMember(overrides: Partial<ProjectMember> = {}): ProjectMember {
    const id = ++this.memberCounter;
    const roles = ['Director', 'Producer', 'Animator', 'Modeler', 'Rigger', 'Lighter', 'Compositor'];
    const departments = ['ANIMATION', 'PRODUCTION', 'MODELING', 'RIGGING', 'LIGHTING', 'COMPOSITING'];
    const permissions = ['edit', 'view', 'admin'];
    
    return {
      member_id: `member_${id.toString().padStart(3, '0')}`,
      user_id: `user_${id.toString().padStart(3, '0')}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      permissions: permissions[Math.floor(Math.random() * permissions.length)] as any,
      joined_date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      active: Math.random() > 0.1, // 90% active
      ...overrides
    };
  }

  generateProjectMembers(count: number): ProjectMember[] {
    return Array.from({ length: count }, () => this.generateProjectMember());
  }

  // Utility methods for generating realistic content
  private generateShotTitle(): string {
    const adjectives = ['Epic', 'Dramatic', 'Action', 'Emotional', 'Intense', 'Beautiful', 'Dynamic', 'Powerful'];
    const nouns = ['Sequence', 'Scene', 'Moment', 'Battle', 'Chase', 'Dialogue', 'Reveal', 'Climax'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj} ${noun}`;
  }

  private generateAssetName(): string {
    const prefixes = ['Hero', 'Main', 'Secondary', 'Background', 'Crowd', 'Featured'];
    const types = ['Character', 'Vehicle', 'Building', 'Prop', 'Environment', 'Weapon'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return `${prefix} ${type}`;
  }

  private generateNotes(entityType: string): string {
    const noteTemplates = {
      shot: [
        'Key animation shot for the sequence',
        'Requires special attention to character performance',
        'Complex camera movement - coordinate with layout team',
        'Hero shot with detailed facial animation',
        'Action sequence with multiple characters',
        'Dialogue scene - focus on lip sync accuracy'
      ],
      asset: [
        'High-detail hero asset for close-up shots',
        'Modular design for easy variations',
        'Requires advanced rigging for complex deformations',
        'Background asset - optimize for performance',
        'Key story element - maintain visual consistency',
        'Crowd asset - create multiple variations'
      ],
      task: [
        'High priority - needed for upcoming milestone',
        'Coordinate with other departments',
        'Reference materials available in shared folder',
        'Client feedback incorporated',
        'Technical challenge - may need R&D time',
        'Standard workflow applies'
      ]
    };
    
    const templates = noteTemplates[entityType as keyof typeof noteTemplates] || noteTemplates.shot;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Generate complete project dataset
  generateProjectDataset(options: {
    users?: number;
    shots?: number;
    assets?: number;
    tasks?: number;
    members?: number;
  } = {}): {
    users: User[];
    shots: Shot[];
    assets: Asset[];
    tasks: Task[];
    members: ProjectMember[];
  } {
    const {
      users = 10,
      shots = 50,
      assets = 30,
      tasks = 100,
      members = 8
    } = options;

    return {
      users: this.generateUsers(users),
      shots: this.generateShots(shots),
      assets: this.generateAssets(assets),
      tasks: this.generateTasks(tasks),
      members: this.generateProjectMembers(members)
    };
  }

  // Generate realistic file metadata
  generateFileMetadata(entityType: EntityType, entityId: string, fieldName: string) {
    const fileTypes = {
      thumbnails: [
        { name: 'thumbnail_01.jpg', size: 245760, mimeType: 'image/jpeg' },
        { name: 'thumbnail_02.png', size: 512000, mimeType: 'image/png' },
        { name: 'reference.jpg', size: 1048576, mimeType: 'image/jpeg' }
      ],
      file_list: [
        { name: 'source_file.ma', size: 15728640, mimeType: 'application/octet-stream' },
        { name: 'texture_map.exr', size: 8388608, mimeType: 'image/x-exr' },
        { name: 'animation_data.fbx', size: 5242880, mimeType: 'application/octet-stream' }
      ],
      versions: [
        { name: 'v001.ma', size: 12582912, mimeType: 'application/octet-stream' },
        { name: 'v002.ma', size: 13107200, mimeType: 'application/octet-stream' },
        { name: 'v003_final.ma', size: 14680064, mimeType: 'application/octet-stream' }
      ]
    };

    const files = fileTypes[fieldName as keyof typeof fileTypes] || fileTypes.file_list;
    const selectedFile = files[Math.floor(Math.random() * files.length)];

    return {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: selectedFile.name,
      size: selectedFile.size,
      mimeType: selectedFile.mimeType,
      path: `/${entityType}_${entityId}/${fieldName ? fieldName + '/' : ''}${selectedFile.name}`,
      url: `https://drive.google.com/file/d/file_${Date.now()}`
    };
  }

  // Generate realistic update scenarios for conflict testing
  generateConflictScenarios(entityType: EntityType, entityId: string) {
    const scenarios = {
      [ENTITY_KIND.SHOT]: [
        { fieldId: 'title', originalValue: 'Opening Scene', newValue: 'Epic Opening Scene' },
        { fieldId: 'status', originalValue: 'in_progress', newValue: 'completed' },
        { fieldId: 'priority', originalValue: '2', newValue: '1' },
        { fieldId: 'notes', originalValue: 'Initial notes', newValue: 'Updated with client feedback' }
      ],
      [ENTITY_KIND.ASSET]: [
        { fieldId: 'name', originalValue: 'Hero Character', newValue: 'Main Hero Character' },
        { fieldId: 'status', originalValue: 'modeling', newValue: 'texturing' },
        { fieldId: 'overlap_sensitive', originalValue: 'false', newValue: 'true' }
      ],
      [ENTITY_KIND.TASK]: [
        { fieldId: 'name', originalValue: 'Animation', newValue: 'Character Animation' },
        { fieldId: 'status', originalValue: 'assigned', newValue: 'in_progress' },
        { fieldId: 'assignee_id', originalValue: 'user_001', newValue: 'user_002' }
      ]
    };

    const entityScenarios = (scenarios as any)[entityType] || scenarios[ENTITY_KIND.SHOT];
    return entityScenarios.map((scenario: any) => ({
      ...scenario,
      entityId,
      sheetName: this.getSheetName(entityType)
    }));
  }

  private getSheetName(entityType: EntityType): string {
    const sheetNames = {
      [ENTITY_KIND.SHOT]: 'Shots',
      [ENTITY_KIND.ASSET]: 'Assets',
      [ENTITY_KIND.TASK]: 'Tasks',
      [ENTITY_KIND.MEMBER]: 'ProjectMembers',
      [ENTITY_KIND.USER]: 'Users'
    };
    return sheetNames[entityType];
  }

  // Generate performance test datasets
  generateLargeDataset(size: 'small' | 'medium' | 'large' | 'xlarge') {
    const sizes = {
      small: { users: 10, shots: 50, assets: 30, tasks: 100, members: 8 },
      medium: { users: 25, shots: 200, assets: 150, tasks: 500, members: 20 },
      large: { users: 50, shots: 1000, assets: 500, tasks: 2000, members: 40 },
      xlarge: { users: 100, shots: 5000, assets: 2000, tasks: 10000, members: 80 }
    };

    return this.generateProjectDataset(sizes[size]);
  }

  // Generate concurrent user scenarios
  generateConcurrentUserScenarios(userCount: number) {
    const users = this.generateUsers(userCount);
    const scenarios = [];

    for (let i = 0; i < userCount; i++) {
      const user = users[i];
      const operations = [];

      // Each user performs a mix of operations
      for (let j = 0; j < 5; j++) {
        const operationType = Math.floor(Math.random() * 4);
        
        switch (operationType) {
          case 0: // Create entity
            operations.push({
              type: 'create',
              entityType: ENTITY_KIND.SHOT,
              data: this.generateShot({ shot_id: `concurrent_${user.user_id}_${j}` })
            });
            break;
            
          case 1: // Update entity
            operations.push({
              type: 'update',
              entityType: ENTITY_KIND.SHOT,
              entityId: `shot_${Math.floor(Math.random() * 10 + 1).toString().padStart(3, '0')}`,
              updates: { status: 'updated_by_' + user.name }
            });
            break;
            
          case 2: // Read entities
            operations.push({
              type: 'read',
              entityType: ENTITY_KIND.SHOT,
              filters: { status: 'in_progress' }
            });
            break;
            
          case 3: // File operation
            operations.push({
              type: 'file_upload',
              entityType: ENTITY_KIND.SHOT,
              entityId: `shot_${Math.floor(Math.random() * 10 + 1).toString().padStart(3, '0')}`,
              file: this.generateFileMetadata(ENTITY_KIND.SHOT, 'shot_001', 'thumbnails')
            });
            break;
        }
      }

      scenarios.push({
        user,
        operations,
        delay: Math.random() * 1000 // Random delay up to 1 second
      });
    }

    return scenarios;
  }
}

// Export singleton instance
export const testDataGenerator = TestDataGenerator.getInstance();