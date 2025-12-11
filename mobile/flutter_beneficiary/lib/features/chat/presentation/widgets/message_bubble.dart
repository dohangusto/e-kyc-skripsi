import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../bloc/chat_state.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const MessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final alignment = message.isFromUser
        ? Alignment.centerRight
        : Alignment.centerLeft;
    final bubbleColor = message.isFromUser
        ? AppColors.primary
        : AppColors.surface;
    final textColor = message.isFromUser ? Colors.white : AppColors.textPrimary;

    return Align(
      alignment: alignment,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: message.isFromUser
              ? []
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 3),
                  ),
                ],
        ),
        child: Text(message.text, style: TextStyle(color: textColor)),
      ),
    );
  }
}
