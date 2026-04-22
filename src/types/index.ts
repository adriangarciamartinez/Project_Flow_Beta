export type ProjectStatus = 'idea' | 'in-progress' | 'review' | 'completed' | 'archived'

export type SoftwareTag = 
  | 'Houdini' 
  | 'Nuke' 
  | 'Blender' 
  | 'Unreal Engine' 
  | 'Cinema 4D' 
  | 'After Effects' 
  | 'DaVinci Resolve'
  | 'Maya'
  | 'ZBrush'
  | 'Substance'
  | 'Katana'
  | 'Arnold'
  | 'Redshift'
  | 'Octane'
  | string

export interface Project {
  id: string
  title: string
  description: string
  client: string
  tags: string[]
  softwareTags: SoftwareTag[]
  status: ProjectStatus
  startDate: string | null
  deadline: string | null
  coverImage: string | null
  folderPath: string | null
  notes: string
  accentColor?: string | null   // optional subtle accent for card
  createdAt: string
  updatedAt: string
  pipelineNodes: PipelineNode[]
  renders: MediaFile[]
  previews: MediaFile[]
  references: ReferenceItem[]
  discoveries?: DiscoveryItem[]
}

export interface PipelineNode {
  id: string
  label: string
  completed: boolean
  order: number
  completedAt?: string | null
}

export interface MediaFile {
  id: string
  filePath: string
  filename: string
  type: 'image' | 'video'
  thumbnailPath?: string
  comment: string
  versionLabel: string
  addedAt: string
  size?: number
}

export interface ReferenceItem {
  id: string
  type: 'image' | 'video' | 'pdf' | 'link' | 'note'
  filePath?: string
  url?: string
  title: string
  content?: string
  tags: string[]
  addedAt: string
}

export interface AppSettings {
  theme: 'dark' | 'light'
  defaultFolderStructure: string[]
  defaultPipelineTemplate: DefaultPipelineNode[]
  importBehavior: 'copy' | 'link'
  dataDirectory: string
}

export interface DefaultPipelineNode {
  id: string
  label: string
  order: number
}

export type ViewMode = 'grid' | 'list'
export type SortField = 'updatedAt' | 'createdAt' | 'title' | 'deadline'
export type SortOrder = 'asc' | 'desc'

export interface FilterState {
  status: ProjectStatus | 'all'
  search: string
  sortField: SortField
  sortOrder: SortOrder
  viewMode: ViewMode
}

export type ProjectSection = 
  | 'overview' 
  | 'renders' 
  | 'previews' 
  | 'references' 
  | 'notes' 
  | 'pipeline'

// ── EXR / AOV types ─────────────────────────────────
export interface EXRPass {
  name: string
  channel: string
  type: 'beauty' | 'diffuse' | 'specular' | 'emission' | 'reflection' | 
        'refraction' | 'cryptomatte' | 'normals' | 'depth' | 'custom'
}

export interface EXRMetadata {
  width: number
  height: number
  compression: string
  passes: EXRPass[]
  rawHeader: Record<string, string>
}

export interface MediaFileV2 extends MediaFile {
  isEXR?: boolean
  exrMetadata?: EXRMetadata
  exrActivePass?: string
}

// ── Reference Board types ────────────────────────────
export interface BoardItem {
  id: string
  refId: string          // links to ReferenceItem.id
  x: number
  y: number
  w: number
  h: number
  rotation: number
  zIndex: number
  pinned: boolean
  annotation?: string
  groupId?: string
}

export interface BoardConnection {
  id: string
  fromId: string         // BoardItem.id
  toId: string
  label?: string
}

export interface BoardAnnotation {
  id: string
  x: number
  y: number
  text: string
  color: string
}

export interface ReferenceBoard {
  items: BoardItem[]
  connections: BoardConnection[]
  annotations: BoardAnnotation[]
  drawings: string[]     // SVG path data strings
  scale: number
  panX: number
  panY: number
}

// ── Extended project fields ──────────────────────────
// These are stored inline in the Project object via DB
export interface DiscoveryItem {
  id: string
  type: 'note' | 'link' | 'video' | 'image' | 'file' | 'youtube'
  title: string
  content?: string      // markdown notes
  url?: string          // links / youtube
  filePath?: string     // local files
  youtubeId?: string    // parsed youtube id for embed
  tags: string[]
  addedAt: string
}
