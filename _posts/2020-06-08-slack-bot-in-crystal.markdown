---
title: Writing Slack bot in Crystal programming language
date: 2020-06-08T15:14:57+02:00
categories:
excerpt: Small tutorial that shows how to quickly create a slack bot using Crystal programming language
tags:
  - crystal-lang
  - slack
published: true
---

[Crystal](https://crystal-lang.org/) is a young statically typed programming
language which is intended to be very fast (because of compile-time evaluation)
and which has a very readable syntax similar to Ruby.
Crystal is still **not production ready** and often introduce breaking changes
during new releases. That means it can become painful to maintain a big codebase
written in Crystal.

However, I personally think Crystal
**can be very suitable for small microservices**. Just because the language
is very fast and the microservice utilizes quite a small piece of code.

One of such simple examples we use in our company is a Slack bot, which helps
people to find some project related information directly in Slack without
bothering colleagues.

In this article you will find how to write such a bot in Crystal,
deploy it and install to your slack workspace.

![](https://user-images.githubusercontent.com/3624712/76700932-2a26d580-66c5-11ea-85cf-48f565a73850.jpg)

## Bot definition

To extend some interactivity, Slack introduced
[slash commands](https://slack.com/intl/en-ua/help/articles/201259356-Use-built-in-slash-commands).
Basically it acts as a shortcut for some specific action directly in Slack.
There are built-in commands and
[custom ones are allowed too](https://api.slack.com/interactivity/slash-commands).

Basically, if we would like to create a new slash command, we would need to have
a standalone microservice available on the internet, which could handle the
HTTP requests from Slack when users execute such a slash command.

So let's give it a try. **We will create `/prince` slash command** which accepts
some arguments and prints project related information to on-board our newcomers.

## Start a new project

From the very beginning we would need to generate a new Crystal application:

```sh
$ crystal init app prince-slack_bot
```

It creates a new project skeleton for our app with a couple of important files/folders:

```sh
$ tree prince-slack_bot

prince-slack_bot
├── LICENSE
├── README.md
├── shard.yml
├── spec
│   ├── prince-slack_bot_spec.cr
│   └── spec_helper.cr
└── src
    └── prince-slack_bot.cr

2 directories, 6 files
```

* `shard.yml` - this is where we will define our project specific settings, like
   a version of Crystal to run the app on, the version of our app, dependencies etc
* `src/` - a folder that holds our sources and the target to run
* `spec/` - tests for the sources


## Let it serve

Our slack bot will have to be running as a standalone server, accept HTTP
requests and respond to them. In order to do that we could use the
[HTTP Server](https://crystal-lang.org/reference/overview/http_server.html)
available in the stdlib. However, it is quite minimalistic and lacks a
couple of important features.

A more advanced alternative is [Kemal](https://kemalcr.com/), a defacto fast
and effective web framework which perfectly matches our requirements (to build a
microservice).
We can easily add it to `shard.yml` as a project dependency:

```yml
dependencies:
  kemal:
    github: kemalcr/kemal
```

And install through the `shards install` command.

At this point, we are ready to create a serveable app, which could respond to
HTTP requests. Let's create `src/app.cr` file (which is will become a starting
point for our app) and implement a server using `Kemal`:

```crystal
require "kemal"

get "/" do
  "Prince Slack Bot is alive"
end

post "/command" do |env|
  env.response.content_type = "application/json"

  # TODO: process env.params and respond
  ({} of String => String).to_json
end

port = ENV["PORT"]?.try(&.to_i) || 3000
Kemal.run(port)
```

Here we defined 2 endpoints:

1. `GET /` - shows that our app is alive. Will be helpful to ensure our app is
   running once deployed.
2. `POST /command` - an actual endpoint to process a command from the slack app.
   Will accept JSON params and respond with JSON content.

We can easily try running our dummy app:
```sh
$ crystal src/app.cr
[development] Kemal is ready to lead at http://0.0.0.0:3000
2020-03-14 20:18:00 UTC 200 GET / 49.78µs
```

And see whether it works in a browser:

![](https://user-images.githubusercontent.com/3624712/76689770-edfe6100-6641-11ea-8ff6-61052db2907a.png)

## Process Slack requests

We ran a simple HTTP server which is able to accept commands through the
`/command` endpoint. This is a time to add an ability to process them and return
some results.

For slash commands, Slack uses `text` as a request body parameter to pass
everything was typed after the command. For example, if user types `/prince hello world`
in Slack, our server will be hitted by the HTTP request having `hello world` in
`text` body param.

So we would just need to take the `text` param and parse it into something we
can run:

```crystal
module Prince::SlackBot
  def self.process(request)
    text = request.body["text"]
    parse(text).run
  end

  def self.parse(text)
    # TODO: parse command args into the runnable commands
  end
end
```

And at this point we can change our handler to process `/command` endpoint in
`src/app.cr` file and use just defined high level command processor:

```diff

# src/app.cr

post "/command" do |env|
  env.response.content_type = "application/json"

-  # TODO: process env.params and respond
-  ({} of String => String).to_json
+  Prince::SlackBot.process(env.request).to_json
end

```

### Define commands

We would like to define a notion of `command`, e. g. a slack user will have to
type `/prince cmd args`, where `cmd` is a predefined command by our bot, and it
accepts some arguments `args`.

In order to do so, we can just split our `text` HTTP parameter, extract
command (the first word) the its arguments (the rest) and instantiate such a command:

```diff
def self.parse(text)
-  # TODO: parse command args into the processable commands
+  words = (text || "").split(' ', remove_empty: true)
+  cmd, args = words[0]?, words[1..-1]?

+  case cmd
+  when "help"
+    Command::Help.new args
+  when "status"
+    Command::Status.new args
+  when # a bag of other commands go here
+  else
+    Command::Help.new args
+  end
end
```

Command on other hand can be just a class, which accepts the arguments during
initialization and responds to the `#run` method:

```crystal
module Prince::SlackBot::Command
  class Help
    def initialize(@args = [] of String)
    end

    def run
      { "text" => help }
    end

    private def help
      <<-TEXT
      *Usage*: `/prince cmd args`
      *Available commands:*
       `help`   - prints this help
       `status` - prints the status of the prince app (Up/Down)
       # ...
      TEXT
    end
  end
end
```

Similar to requests, Slack expects JSON response with the `text` attribute inside.
For the help command above we just send the help information in the `text` attribute.

Similar to the `Help` we can define other commands (to show the status of our
app, to print links to GitHub repositories etc.)

## Deploy

We need our app to be open to the world in order handle Slack requests. So we
need to deploy it somewhere. The simplest way to deploy Crystal apps is using
[Heroku](https://heroku.com/).

There is a [great article](https://crystal-lang.org/2016/05/26/heroku-buildpack.html)
which explains how to deploy Crystal apps using Crystal Heroku Buildpack. At
some point we just need to push our code to `heroku` origin:

```sh
$ git push heroku master
Counting objects: 8, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (17/17), done.
Writing objects: 100% (8/8), 0.94 KiB | 0 bytes/s, done.
Total 8 (delta 8), reused 0 (delta 0)
remote: Compressing source files... done.
remote: Building source:
remote:
remote: -----> Fetching set buildpack https://github.com/crystal-lang/heroku-buildpack-crystal.git... done
remote: -----> Crystal app detected
remote: -----> Installing Crystal (0.31.0 due to latest release at https://github.com/crystal-lang/crystal)
remote: -----> Installing Dependencies
remote: -----> Compiling src/app.cr (auto-detected from shard.yml)
remote:
remote: -----> Discovering process types
remote:        Procfile declares types     -> (none)
remote:        Default types for buildpack -> web
remote:
remote: -----> Compressing...
remote:        Done: 289.4K
remote: -----> Launching...
remote:        Released v3
remote:        https://prince-slack-bot.herokuapp.com deployed to Heroku
remote:
remote: Verifying deploy.... done.
To https://prince-slack-bot.herokuapp.com.git
 * [new branch]      master -> master
```

As we can see, it was successfully deployed and we can check our app
availability at https://prince-slack-bot.herokuapp.com.

## Configure Slack APP

Our bot is ready to handle Slack requests. However, Slack should know about it.
There are a couple of steps to do here.

1. Create a new Slack app in the Slack workspace:

![](https://user-images.githubusercontent.com/3624712/76696821-2e88c980-6698-11ea-8579-2379014ad425.png)

2. Define a Slack slash command filling a command name, request URL (the URL
   our bot is available at), description and some help information which will be
   shown to users:

![](https://user-images.githubusercontent.com/3624712/76696839-77d91900-6698-11ea-9652-f2b2145c1f01.png)

3. Now, when the app is activated and becomes available as a slash command in
   our workspace, we can try typing `/prince`, hit enter and see the results.

![](https://user-images.githubusercontent.com/3624712/76696876-fdf55f80-6698-11ea-8237-502535622bec.png)

## Wrap-up

In this article we showed how to create a Slack bot written in Crystal
programming language, deployed it to Heroku and configured Slack application to
interact with it.

In next articles we will talk about how to properly sign off Slack requests and
write tests for our app.
