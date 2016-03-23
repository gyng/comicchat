extern crate websocket;
extern crate rustc_serialize;

use std::thread;
use std::sync::Arc;
use rustc_serialize::json;
use websocket::{Server, Message, Sender, Receiver};
use websocket::message::Type;
use websocket::header::WebSocketProtocol;
use std::io::Read;
use websocket::ws::dataframe::DataFrame;
use websocket::WebSocketStream;

#[derive(RustcDecodable, RustcEncodable, Debug)]
pub struct ComicMessage {
    message_type: String,
    room: String,
    time: String,
    text: String,
    author: String
}

fn main() {
    // TODO: Read config
    let host = "0.0.0.0:8084";
    let server = Server::bind(host).unwrap();
    // let clients = Arc::new(Vec::new());

    for connection in server {
        thread::spawn(move || {
            let request = connection.unwrap().read_request().unwrap();
            let headers = request.headers.clone();

            request.validate().unwrap();

            let mut response = request.accept();

            if let Some(&WebSocketProtocol(ref protocols)) = headers.get() {
                if protocols.contains(&("comic-chat".to_string())) {
                    response.headers.set(WebSocketProtocol(vec!["comic-chat".to_string()]));
                }
            }

            let mut client = response.send().unwrap();
            // clients.push(&client);
            let client_ip = client.get_mut_sender().get_mut().peer_addr().unwrap();

            println!("Connection from {}", client_ip);

            let message: Message = Message::text("Connected".to_string());
            client.send_message(&message).unwrap();

            let (mut sender, mut receiver) = client.split();

            for message in receiver.incoming_messages() {
                let message: Message = message.unwrap();

                match message.opcode {
                    Type::Close => {
                        let message = Message::close();
                        sender.send_message(&message).unwrap();
                        println!("Client {} disconencted", client_ip);
                        return;
                    },
                    Type::Ping => {
                        let message = Message::pong(message.payload);
                        sender.send_message(&message).unwrap();
                    },
                    Type::Text => {
                        println!("Text");
                        handle(&mut sender, message);
                    },
                    _ => sender.send_message(&message).unwrap()
                }
            }
        });
    }
}

fn handle<T: Sender>(sender: &mut T, message: Message) -> Result<(), ()> {
    let payload = String::from_utf8(message.payload().into_owned()).expect("failed to convert payload into string");
    let decoded: ComicMessage = json::decode(&payload).expect("failed to decode JSON");
    println!("{:?}", decoded);

    match decoded.message_type.as_ref() {
        "message" => {
            sender.send_message(&message).expect("failed to send message in text");
            // How to broadcast?
            Ok(())
        },
        _ => Ok(()) // unknown
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
    }
}
