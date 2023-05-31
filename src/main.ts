import { randomUUID } from 'node:crypto'
import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  rmdirSync,
} from 'node:fs'
import { join } from 'node:path'

class Database {
  public _onConnect: (() => void)[] = []
  public baseDir: string = ''

  public createCollection(collection: string) {
    const path: string = join(this.baseDir, `${collection}.json`)
    if (!existsSync(path)) {
      this.write(path, [])
    }
  }

  public setBaseDir(baseDir: string) {
    this.baseDir = baseDir

    if (!existsSync(baseDir)) {
      mkdirSync(this.baseDir)
    }
  }

  connect() {
    for (const handler of this._onConnect) {
      handler()
    }
  }

  public onConnect(fn: () => void) {
    this._onConnect.push(fn)
  }

  public read(collection: string): any[] {
    const path: string = join(this.baseDir, `${collection}.json`)
    return JSON.parse(readFileSync(path).toString())
  }

  public write(collection: string, data: any[]) {
    writeFileSync(
      join(this.baseDir, `${collection}.json`),
      JSON.stringify(data)
    )
  }
}

let _db: Database = new Database()
async function connect(baseDir: string) {
  _db.setBaseDir(baseDir)
  _db.connect()
}

class Model<T, T2 extends T & {id: string}> {
  constructor(private _collection: string, private _schema: T) {
    _db.onConnect(() => {
      _db.createCollection(this._collection)
    })
  }

  public async findOne(query: Partial<T2>): Promise<T2 | undefined> {
    const collection = _db.read(this._collection)
    let result: T2 | undefined = collection.filter((item) => {
      if (
        Object.keys(query).every((key) => item[key] === query[key as keyof T])
      ) {
        return true
      }
    })[0]
    return result
  }

  public async create(data: T): Promise<T2> {
    const collection = _db.read(this._collection)
    const newData = {
      ...data,
      id: randomUUID() as string,
    } as T2
    collection.push(newData)
    _db.write(this._collection, collection)
    return newData
  }

  public findMany(query: Partial<T2>): T2[] {
    const collection: T2[] = _db.read(this._collection)
    return collection.filter((item) => {
      if (
        Object.keys(query).every((key) => item[key as keyof T2] === query[key as keyof T2])
      ) {
        return true
      }
    })
  }
}

function model<T>(collection: string, schema: T) {
  return new Model(collection, schema)
}

const User = model('users', {
  name: '',
  email: '',
  password: '',
})

async function init() {
  await connect('database')
  console.log(await User.findMany({}))
  await User.create({
    email: 'angelhdz@gmail.com',
    name: 'Angel',
    password: '123456',
  })
  console.log(await User.findOne({ email: 'angelhdz@gmail.com' }))
}

init()
